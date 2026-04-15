import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  pixBeneficiary: string | null;
}

export interface ParsedStatement {
  bank: string | null;
  transactions: ParsedTransaction[];
}

// ---------------------------------------------------------------------------
// Phase 1 – Smart text extraction
// ---------------------------------------------------------------------------

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

interface TextRow {
  items: TextItem[];
  text: string;
}

function extractTextItems(content: { items: unknown[] }): TextItem[] {
  const out: TextItem[] = [];
  for (const item of content.items) {
    if (
      item !== null &&
      typeof item === "object" &&
      "str" in item &&
      "transform" in item
    ) {
      const rec = item as { str: string; transform: number[]; width?: number };
      if (rec.str.length > 0) {
        out.push({
          str: rec.str,
          x: Math.round(rec.transform[4]),
          y: Math.round(rec.transform[5]),
          width: Math.round(rec.width ?? 0),
        });
      }
    }
  }
  return out;
}

/** Join items in a line using width-based gap detection. */
function joinLineItems(items: TextItem[]): string {
  if (items.length === 0) return "";
  let result = "";
  for (let i = 0; i < items.length; i++) {
    const curr = items[i];
    // Space-only items act as word separators
    if (curr.str.trim() === "") {
      if (result.length > 0 && !result.endsWith(" ")) result += " ";
      continue;
    }
    // For non-space items, check gap to previous non-space item
    if (result.length > 0 && !result.endsWith(" ")) {
      let prev: TextItem | undefined;
      for (let j = i - 1; j >= 0; j--) {
        if (items[j].str.trim()) { prev = items[j]; break; }
      }
      if (prev) {
        const gap = curr.x - (prev.x + prev.width);
        if (gap > 2) result += " ";
      }
    }
    result += curr.str;
  }
  return result.trim();
}

/** Group text items into rows by Y position, preserving item data. */
function groupIntoRows(items: TextItem[], tolerance = 4): TextRow[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextRow[] = [];
  let currentY = sorted[0].y;
  let currentItems: TextItem[] = [];

  for (const item of sorted) {
    if (Math.abs(item.y - currentY) <= tolerance) {
      currentItems.push(item);
    } else {
      currentItems.sort((a, b) => a.x - b.x);
      rows.push({ items: currentItems, text: joinLineItems(currentItems) });
      currentItems = [item];
      currentY = item.y;
    }
  }
  if (currentItems.length > 0) {
    currentItems.sort((a, b) => a.x - b.x);
    rows.push({ items: currentItems, text: joinLineItems(currentItems) });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Phase 2 – Auto-detect statement format
// ---------------------------------------------------------------------------

type StatementFormat =
  | { type: "columns"; creditX: number; debitX: number; saldoX: number }
  | { type: "bb" }
  | { type: "sicredi" }
  | { type: "generic" };

function detectFormat(rows: TextRow[]): StatementFormat {
  for (const row of rows.slice(0, 20)) {
    // Bradesco-style: header has "Crédito" and "Débito" column names
    if (/cr[eé]dito/i.test(row.text) && /d[eé]bito/i.test(row.text)) {
      let creditX = 0;
      let debitX = 0;
      let saldoX = 0;
      for (const item of row.items) {
        if (/cr[eé]dito/i.test(item.str)) creditX = item.x;
        else if (/d[eé]bito/i.test(item.str)) debitX = item.x;
        else if (/saldo/i.test(item.str)) saldoX = item.x;
      }
      if (creditX && debitX) {
        return { type: "columns", creditX, debitX, saldoX };
      }
    }
  }

  // Check first 40 lines for amount patterns
  let bbCount = 0;
  let sicrediCount = 0;
  for (const row of rows.slice(0, 40)) {
    if (/\d,\d{2}\s*\([+-]\)/.test(row.text)) bbCount++;
    if (/[-+]\s*R\$\s*[\d.,]+/.test(row.text)) sicrediCount++;
  }

  if (bbCount >= 2) return { type: "bb" };
  if (sicrediCount >= 2) return { type: "sicredi" };
  return { type: "generic" };
}

// ---------------------------------------------------------------------------
// Phase 3 – Format-specific parsers
// ---------------------------------------------------------------------------

const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;

function toIsoDate(dateStr: string): string {
  const [day, month, year] = dateStr.split("/");
  return `${year}-${month}-${day}`;
}

function parseAmount(raw: string): number {
  return Number.parseFloat(raw.replace(/\./g, "").replace(",", "."));
}

function isSaldoLine(text: string): boolean {
  const t = text.trim();
  return (
    /^s\s*a\s*l\s*d\s*o\b/i.test(t) ||
    /\bsaldo\s+(anterior|do\s+dia|final|atual|disponível|parcial)\b/i.test(t) ||
    /^s\s+a\s+l\s+d\s+o$/i.test(t)
  );
}

function isTotalLine(text: string): boolean {
  return /^\s*total\b/i.test(text);
}

function pushTransaction(
  txs: ParsedTransaction[],
  date: string,
  description: string,
  amount: number,
  type: "income" | "expense",
): void {
  if (Number.isNaN(amount) || amount === 0) return;
  const desc = description.replace(/\s+/g, " ").trim();
  if (desc.length <= 3 || desc.length >= 200) return;
  if (isSaldoLine(desc) || isTotalLine(desc)) return;
  const pixBeneficiary = extractPixBeneficiary(desc);
  txs.push({ date, description: desc, amount, type, pixBeneficiary });
}

// ---- Sicredi parser ----

function parseSicredi(rows: TextRow[]): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  // Sicredi format: "DD/MM/YYYY DESCRIPTION [-+]R$ amount"
  // Multi-line: description on line above, date + amount on next line
  const SICREDI_FULL =
    /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-+])\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  const SICREDI_DATEAMOUNT =
    /^(\d{2}\/\d{2}\/\d{4})\s+([-+])\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  const SICREDI_AMOUNTONLY =
    /^([-+])\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/;

  let lastDate: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const line = rows[i].text;
    if (isSaldoLine(line) || isTotalLine(line)) continue;

    // Full line: date + description + amount
    let m = SICREDI_FULL.exec(line);
    if (m) {
      const date = toIsoDate(m[1]);
      lastDate = date;
      const desc = m[2];
      const sign = m[3];
      const amount = parseAmount(m[4]);
      const type: "income" | "expense" = sign === "+" ? "income" : "expense";
      pushTransaction(txs, date, desc, amount, type);
      continue;
    }

    // Date + amount only (description on surrounding lines)
    m = SICREDI_DATEAMOUNT.exec(line);
    if (m) {
      const date = toIsoDate(m[1]);
      lastDate = date;
      const sign = m[2];
      const amount = parseAmount(m[3]);
      const type: "income" | "expense" = sign === "+" ? "income" : "expense";
      // Gather description from adjacent lines
      const descParts: string[] = [];
      if (i > 0 && !SICREDI_FULL.test(rows[i - 1].text) && !SICREDI_DATEAMOUNT.test(rows[i - 1].text) && !isSaldoLine(rows[i - 1].text)) {
        descParts.push(rows[i - 1].text.trim());
      }
      if (i < rows.length - 1 && !SICREDI_FULL.test(rows[i + 1].text) && !SICREDI_DATEAMOUNT.test(rows[i + 1].text) && !isSaldoLine(rows[i + 1].text) && !/^\d{2}\/\d{2}\/\d{4}/.test(rows[i + 1].text)) {
        descParts.push(rows[i + 1].text.trim());
      }
      const desc = descParts.join(" - ");
      pushTransaction(txs, date, desc, amount, type);
      continue;
    }

    // Amount only (no date, continuation)
    if (lastDate) {
      m = SICREDI_AMOUNTONLY.exec(line);
      if (m) {
        const sign = m[1];
        const amount = parseAmount(m[2]);
        const type: "income" | "expense" = sign === "+" ? "income" : "expense";
        const descParts: string[] = [];
        if (i > 0 && !SICREDI_FULL.test(rows[i - 1].text) && !SICREDI_DATEAMOUNT.test(rows[i - 1].text) && !SICREDI_AMOUNTONLY.test(rows[i - 1].text) && !isSaldoLine(rows[i - 1].text)) {
          descParts.push(rows[i - 1].text.trim());
        }
        if (i < rows.length - 1 && !SICREDI_FULL.test(rows[i + 1].text) && !SICREDI_DATEAMOUNT.test(rows[i + 1].text) && !isSaldoLine(rows[i + 1].text) && !/^\d{2}\/\d{2}\/\d{4}/.test(rows[i + 1].text)) {
          descParts.push(rows[i + 1].text.trim());
        }
        const desc = descParts.join(" - ");
        pushTransaction(txs, lastDate, desc, amount, type);
      }
    }
  }
  return txs;
}

// ---- BB parser ----

const BB_AMOUNT_RE =
  /^(\d{2}\/\d{2}\/\d{4})\s+(.*\s+)?(\d{1,3}(?:\.\d{3})*,\d{2})\s*\(([+-])\)\s*$/;
const BB_NODATE_RE =
  /^(.*?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s*\(([+-])\)\s*$/;

function isBBDescriptionLine(line: string): boolean {
  if (/^\d{2}\/\d{2}\/\d{4}/.test(line)) return false;
  if (/,\d{2}\s*\([+-]\)/.test(line)) return false;
  if (/^(Dia|Lote|Documento|Hist|Valor|Lançamentos|Informaç|Total\s|Taxa\s|\(\*\)|Tributos|Custo|Data\s+Venc|Sujeitos|\*\s|-\s)/i.test(line)) return false;
  if (/^\d+[.,]\d{2}[%]/.test(line)) return false;
  const cleaned = line.replace(/\d+/g, "").trim();
  return cleaned.length > 2;
}

function stripLoteDoc(text: string): string {
  return text.replace(/^\s*(\d{3,}\s+)+/, "").trim();
}

function parseBB(rows: TextRow[]): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  let lastDate: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const line = rows[i].text;

    let m = BB_AMOUNT_RE.exec(line);
    if (m) {
      const date = toIsoDate(m[1]);
      lastDate = date;
      const middleText = stripLoteDoc(m[2] || "").trim();
      const amount = parseAmount(m[3]);
      const sign = m[4];
      const type: "income" | "expense" = sign === "+" ? "income" : "expense";

      const descParts: string[] = [];
      if (i > 0 && isBBDescriptionLine(rows[i - 1].text))
        descParts.push(rows[i - 1].text.trim());
      if (middleText) descParts.push(middleText);
      if (i < rows.length - 1 && isBBDescriptionLine(rows[i + 1].text))
        descParts.push(rows[i + 1].text.trim());

      const desc = descParts.join(" - ");
      pushTransaction(txs, date, desc, amount, type);
      continue;
    }

    if (lastDate) {
      m = BB_NODATE_RE.exec(line);
      if (m) {
        const middleText = stripLoteDoc(m[1]).trim();
        const amount = parseAmount(m[2]);
        const sign = m[3];
        const type: "income" | "expense" = sign === "+" ? "income" : "expense";

        const descParts: string[] = [];
        if (i > 0 && isBBDescriptionLine(rows[i - 1].text))
          descParts.push(rows[i - 1].text.trim());
        if (middleText) descParts.push(middleText);
        if (i < rows.length - 1 && isBBDescriptionLine(rows[i + 1].text))
          descParts.push(rows[i + 1].text.trim());

        const desc = descParts.join(" - ");
        pushTransaction(txs, lastDate, desc, amount, type);
      }
    }
  }
  return txs;
}

// ---- Column-based parser (Bradesco) ----

function parseColumns(
  rows: TextRow[],
  creditX: number,
  debitX: number,
  saldoX: number,
): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  let lastDate: string | null = null;
  const AMOUNT_RE = /^\d{1,3}(?:\.\d{3})*,\d{2}$/;

  // Column midpoints for classification
  const creditMid = creditX;
  const debitMid = debitX;
  const saldoMid = saldoX;

  function classifyItem(item: TextItem): "credit" | "debit" | "saldo" | "other" {
    if (!AMOUNT_RE.test(item.str)) return "other";
    const x = item.x;
    const distCredit = Math.abs(x - creditMid);
    const distDebit = Math.abs(x - debitMid);
    const distSaldo = Math.abs(x - saldoMid);
    const minDist = Math.min(distCredit, distDebit, distSaldo);
    if (minDist > 150) return "other";
    if (minDist === distCredit) return "credit";
    if (minDist === distDebit) return "debit";
    return "saldo";
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = row.text;
    if (isTotalLine(line)) continue;

    // Extract date if line starts with one
    const dateMatch = /^(\d{2}\/\d{2}\/\d{4})/.exec(line);
    if (dateMatch) {
      lastDate = toIsoDate(dateMatch[1]);
    }
    if (!lastDate) continue;

    // Find amounts by column position
    let credit = 0;
    let debit = 0;
    for (const item of row.items) {
      const cls = classifyItem(item);
      if (cls === "credit") credit = parseAmount(item.str);
      else if (cls === "debit") debit = parseAmount(item.str);
    }

    if (credit === 0 && debit === 0) continue;

    // Build description: take text items before the doc/amount columns
    // Description items are those with x < creditX - 50 and not the date
    const descItems = row.items
      .filter((it) => it.x < creditX - 50 && !DATE_RE.test(it.str))
      .map((it) => it.str);
    let desc = descItems.join(" ").replace(/\s+/g, " ").trim();

    // Check adjacent lines for continuation (lines without date and without amounts)
    const contParts: string[] = [];
    // Look above if the line above has no date and no amounts
    if (i > 0 && !dateMatch) {
      // This line is a continuation itself, don't look above
    } else if (i > 0) {
      // Look above for description continuation
      const prevLine = rows[i - 1].text;
      if (
        !/^\d{2}\/\d{2}\/\d{4}/.test(prevLine) &&
        !isTotalLine(prevLine) &&
        !AMOUNT_RE.test(prevLine.split(/\s+/).pop() || "")
      ) {
        // Check if prev row has no column amounts
        let prevHasAmounts = false;
        for (const item of rows[i - 1].items) {
          const cls = classifyItem(item);
          if (cls === "credit" || cls === "debit") prevHasAmounts = true;
        }
        if (!prevHasAmounts && !/^(Data|Hist|Folha)/i.test(prevLine)) {
          contParts.unshift(rows[i - 1].text.trim());
        }
      }
    }
    // Look below for continuation
    for (let j = i + 1; j < rows.length; j++) {
      const nextRow = rows[j];
      if (/^\d{2}\/\d{2}\/\d{4}/.test(nextRow.text)) break;
      if (isTotalLine(nextRow.text)) break;
      let nextHasAmounts = false;
      for (const item of nextRow.items) {
        const cls = classifyItem(item);
        if (cls === "credit" || cls === "debit") {
          nextHasAmounts = true;
          break;
        }
      }
      if (nextHasAmounts) break;
      // Filter description items
      const nextDesc = nextRow.items
        .filter((it) => it.x < creditX - 50 && !DATE_RE.test(it.str))
        .map((it) => it.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (nextDesc.length > 2) contParts.push(nextDesc);
    }

    if (contParts.length > 0) {
      desc = [desc, ...contParts].filter(Boolean).join(" - ");
    }

    if (credit > 0) {
      pushTransaction(txs, lastDate, desc, credit, "income");
    }
    if (debit > 0) {
      pushTransaction(txs, lastDate, desc, debit, "expense");
    }
  }
  return txs;
}

// ---- Generic fallback parser ----

function parseGeneric(rows: TextRow[]): ParsedTransaction[] {
  const txs: ParsedTransaction[] = [];
  const GENERIC_RE =
    /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([+-]?\s*\d{1,3}(?:\.\d{3})*,\d{2})\s*([DC]?)$/;

  for (const row of rows) {
    const m = GENERIC_RE.exec(row.text);
    if (!m) continue;

    const date = toIsoDate(m[1]);
    const description = m[2].trim();
    const rawAmount = m[3].replace(/\s/g, "");
    const numericAmount = parseAmount(rawAmount);
    const amount = Math.abs(numericAmount);
    const flag = m[4] || "";

    let type: "income" | "expense";
    if (flag.toUpperCase() === "D") type = "expense";
    else if (flag.toUpperCase() === "C") type = "income";
    else if (numericAmount < 0) type = "expense";
    else if (rawAmount.startsWith("+")) type = "income";
    else type = inferTypeFromDescription(description);

    pushTransaction(txs, date, description, amount, type);
  }
  return txs;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function parseBankStatementPdf(
  buffer: ArrayBuffer,
): Promise<ParsedStatement> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const allRows: TextRow[] = [];

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = extractTextItems(content);
      const pageRows = groupIntoRows(items);
      page.cleanup();
      allRows.push(...pageRows);
    }
  } finally {
    pdf.destroy();
  }

  const format = detectFormat(allRows);

  let transactions: ParsedTransaction[];
  switch (format.type) {
    case "columns":
      transactions = parseColumns(allRows, format.creditX, format.debitX, format.saldoX);
      break;
    case "bb":
      transactions = parseBB(allRows);
      break;
    case "sicredi":
      transactions = parseSicredi(allRows);
      break;
    case "generic":
      transactions = parseGeneric(allRows);
      break;
  }

  // If detected format found nothing, try others as fallback
  if (transactions.length === 0 && format.type !== "generic") {
    transactions = parseGeneric(allRows);
  }

  const fullText = allRows.map((r) => r.text).join(" ");
  const bank = detectBank(fullText);

  return { bank, transactions };
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

const BANK_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  {
    name: "Itau",
    pattern: /\b(ita[uú]\s*unibanco|banco\s*ita[uú]|itau\.com\.br)\b/i,
  },
  { name: "Bradesco", pattern: /\b(bradesco|banco\s*bradesco)\b/i },
  {
    name: "Banco do Brasil",
    pattern: /\b(banco\s*do\s*brasil|bb\.com\.br)\b/i,
  },
  {
    name: "Caixa",
    pattern:
      /\b(caixa\s*econ[oô]mica|caixa\s*federal|cef\b|caixa\.gov\.br)\b/i,
  },
  {
    name: "Nubank",
    pattern: /\b(nubank|nu\s*pagamentos|nubank\.com\.br)\b/i,
  },
  { name: "Santander", pattern: /\b(santander|banco\s*santander)\b/i },
  { name: "Inter", pattern: /\b(banco\s*inter|inter\.co|bancointer)\b/i },
  { name: "C6 Bank", pattern: /\b(c6\s*bank|c6bank|banco\s*c6)\b/i },
  { name: "Sicoob", pattern: /\b(sicoob|bancoob)\b/i },
  { name: "Sicredi", pattern: /\b(sicredi)\b/i },
  { name: "BTG Pactual", pattern: /\b(btg\s*pactual)\b/i },
  { name: "Safra", pattern: /\b(banco\s*safra|safra\.com\.br)\b/i },
  { name: "Original", pattern: /\b(banco\s*original|original\.com\.br)\b/i },
  { name: "PagBank", pattern: /\b(pagbank|pagseguro)\b/i },
  { name: "Mercado Pago", pattern: /\b(mercado\s*pago)\b/i },
  { name: "Neon", pattern: /\b(banco\s*neon|neon\.com\.br)\b/i },
  { name: "Next", pattern: /\b(banco\s*next|next\.me)\b/i },
  { name: "Banrisul", pattern: /\b(banrisul)\b/i },
  { name: "BRB", pattern: /\b(brb\b|banco\s*de\s*bras[ií]lia)\b/i },
  { name: "Daycoval", pattern: /\b(daycoval)\b/i },
];

function detectBank(text: string): string | null {
  for (const { name, pattern } of BANK_PATTERNS) {
    if (pattern.test(text)) return name;
  }
  return null;
}

const PIX_BENEFICIARY_PATTERNS = [
  /transfer[eê]ncia\s+pix\s*[-–]\s*\d+\s+(.+)/i,
  /transfer[eê]ncia\s+pix\s*[-–]\s*(.+)/i,
  /pagamento\s+pix\s*[-–]\s*\d+\s+(.+)/i,
  /pix\s+enviad[oa]\s*[-–]\s*(.+)/i,
  /pix\s+recebid[oa]\s*[-–]\s*(.+)/i,
  /pix\s+enviad[oa]\s+(.+)/i,
  /pix\s+recebid[oa]\s+(.+)/i,
  /(?:REM|DES):\s*(.+)/i,
];

function extractPixBeneficiary(description: string): string | null {
  for (const pattern of PIX_BENEFICIARY_PATTERNS) {
    const match = pattern.exec(description);
    if (match?.[1]) {
      const name = match[1].trim().replace(/\s+/g, " ");
      if (name.length >= 2 && name.length < 150) return name;
    }
  }
  return null;
}

const INCOME_KEYWORDS =
  /\b(credito|crédito|deposito|depósito|transferencia\s+recebida|pix\s+recebid[oa]|ted\s+recebid[oa]|doc\s+recebid[oa]|estorno|reembolso|rendimento|rentab|dividendo|salario|salário|cashback|devolucao|devolução|resgate|bonificacao|bonificação)\b/i;

const EXPENSE_KEYWORDS =
  /\b(debito|débito|pagamento|pag\b|pix\s+enviad[oa]|transferencia\s+enviad[oa]|ted\s+enviad[oa]|doc\s+enviad[oa]|compra|saque|tarifa|taxa|anuidade|iof|juros|multa|encargo|seguro|mensalidade|assinatura|boleto|fatura|parcela|servico|provisao)\b/i;

function inferTypeFromDescription(description: string): "income" | "expense" {
  if (INCOME_KEYWORDS.test(description)) return "income";
  if (EXPENSE_KEYWORDS.test(description)) return "expense";
  return "expense";
}
