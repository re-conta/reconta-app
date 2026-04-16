import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { parseBankStatementPdf, type ParsedTransaction } from "@/lib/pdf-parser";
import { createTransaction, getAccounts } from "@/lib/database";
import { formatCurrency } from "@/lib/utils";
import { useEffect } from "react";

interface Account {
  id: number;
  name: string;
  type: string;
}

type Step = "idle" | "parsing" | "preview" | "importing" | "done" | "error";

export function ImportarPdfClient() {
  const [step, setStep] = useState<Step>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [bank, setBank] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAccounts().then((accs) => {
      setAccounts(accs);
      if (accs.length > 0) setSelectedAccountId(String(accs[0].id));
    });
  }, []);

  async function processFile(file: File) {
    if (!file.name.endsWith(".pdf")) {
      setErrorMsg("Selecione um arquivo PDF valido.");
      setStep("error");
      return;
    }
    setFileName(file.name);
    setStep("parsing");
    try {
      const buffer = await file.arrayBuffer();
      const result = await parseBankStatementPdf(buffer);
      if (result.transactions.length === 0) {
        setErrorMsg(
          "Nenhuma transacao encontrada no PDF. Verifique se o arquivo e um extrato bancario com texto selecionavel.",
        );
        setStep("error");
        return;
      }
      setBank(result.bank);
      setTransactions(result.transactions);
      setStep("preview");
    } catch (e) {
      setErrorMsg(
        e instanceof Error
          ? e.message
          : "Erro ao processar o PDF. Tente novamente.",
      );
      setStep("error");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  async function handleImport() {
    setStep("importing");
    try {
      const accountId = selectedAccountId || null;
      for (const tx of transactions) {
        await createTransaction({
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          categoryId: null,
          accountId,
          notes: tx.pixBeneficiary ? `PIX: ${tx.pixBeneficiary}` : null,
        });
      }
      setImportedCount(transactions.length);
      setStep("done");
    } catch (e) {
      setErrorMsg(
        e instanceof Error ? e.message : "Erro ao importar transacoes.",
      );
      setStep("error");
    }
  }

  function reset() {
    setStep("idle");
    setFileName("");
    setBank(null);
    setTransactions([]);
    setErrorMsg("");
    setImportedCount(0);
  }

  const incomeCount = transactions.filter((t) => t.type === "income").length;
  const expenseCount = transactions.filter((t) => t.type === "expense").length;
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step: idle or parsing */}
      {(step === "idle" || step === "parsing") && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Account selector */}
              {accounts.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-zinc-300">Conta bancaria</Label>
                  <Select
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                    disabled={step === "parsing"}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <SelectValue placeholder="Selecione uma conta (opcional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {accounts.map((acc) => (
                        <SelectItem
                          key={acc.id}
                          value={String(acc.id)}
                          className="text-zinc-100 focus:bg-zinc-700"
                        >
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Drop zone */}
              <button
                type="button"
                className={`w-full rounded-xl border-2 border-dashed p-12 flex flex-col items-center gap-4 transition-colors cursor-pointer ${
                  dragOver
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50"
                } ${step === "parsing" ? "pointer-events-none opacity-60" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                aria-label="Clique ou arraste um PDF para importar"
              >
                {step === "parsing" ? (
                  <>
                    <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-zinc-200 font-medium">Processando PDF...</p>
                      <p className="text-zinc-500 text-sm mt-1">{fileName}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-14 w-14 rounded-full bg-indigo-600/20 flex items-center justify-center">
                      <Upload className="h-7 w-7 text-indigo-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-zinc-200 font-medium">
                        Arraste o extrato PDF aqui
                      </p>
                      <p className="text-zinc-500 text-sm mt-1">
                        ou clique para selecionar o arquivo
                      </p>
                    </div>
                    <p className="text-xs text-zinc-600">
                      Suporta extratos de Itau, Nubank, Bradesco, Santander e
                      outros bancos brasileiros
                    </p>
                  </>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: preview */}
      {step === "preview" && (
        <div className="space-y-4">
          {/* Summary card */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-zinc-100 font-semibold">{fileName}</h3>
                  </div>
                  {bank && (
                    <p className="text-zinc-500 text-sm mt-0.5">
                      Banco detectado: {bank}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                  aria-label="Cancelar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">
                    Total
                  </p>
                  <p className="text-xl font-bold text-zinc-100 mt-1">
                    {transactions.length}
                  </p>
                  <p className="text-xs text-zinc-600">transacoes</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">
                    Receitas
                  </p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">
                    {formatCurrency(totalIncome)}
                  </p>
                  <p className="text-xs text-zinc-600">{incomeCount} lancamentos</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">
                    Despesas
                  </p>
                  <p className="text-xl font-bold text-red-400 mt-1">
                    {formatCurrency(totalExpense)}
                  </p>
                  <p className="text-xs text-zinc-600">{expenseCount} lancamentos</p>
                </div>
              </div>

              {accounts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                  <Label className="text-zinc-400 text-sm">Importar para conta</Label>
                  <Select
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <SelectValue placeholder="Nenhuma conta" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {accounts.map((acc) => (
                        <SelectItem
                          key={acc.id}
                          value={String(acc.id)}
                          className="text-zinc-100 focus:bg-zinc-700"
                        >
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={reset}
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Importar {transactions.length} transacoes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transaction preview list */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h3 className="text-zinc-200 text-sm font-medium">
                  Pre-visualizacao ({transactions.length} transacoes)
                </h3>
              </div>
              <ul className="divide-y divide-zinc-800 max-h-80 overflow-y-auto">
                {transactions.map((tx) => (
                  <li
                    key={`${tx.date}-${tx.description}-${tx.amount}-${tx.type}`}
                    className="flex items-center justify-between px-6 py-3 gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-zinc-200 text-sm truncate">
                        {tx.description}
                      </p>
                      <p className="text-zinc-600 text-xs mt-0.5">{tx.date}</p>
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        tx.type === "income"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: importing */}
      {step === "importing" && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
            <div className="text-center">
              <p className="text-zinc-200 font-medium">Importando transacoes...</p>
              <p className="text-zinc-500 text-sm mt-1">
                Aguarde enquanto salvamos os dados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: done */}
      {step === "done" && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 flex flex-col items-center gap-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <div className="text-center">
              <p className="text-zinc-100 font-semibold text-lg">
                Importacao concluida!
              </p>
              <p className="text-zinc-400 text-sm mt-1">
                {importedCount} transacoes importadas com sucesso.
              </p>
            </div>
            <Button
              onClick={reset}
              className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Importar outro extrato
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: error */}
      {step === "error" && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <X className="h-6 w-6 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-zinc-100 font-semibold text-lg">
                Erro ao processar
              </p>
              <p className="text-zinc-400 text-sm mt-1 max-w-sm">{errorMsg}</p>
            </div>
            <Button
              onClick={reset}
              variant="outline"
              className="mt-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
