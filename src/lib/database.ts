import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:reconta.db");
  }
  return db;
}

// Categories
export async function getCategories() {
  const d = await getDb();
  return d.select<Array<{ id: number; name: string; color: string; icon: string; type: string }>>(
    "SELECT * FROM categories ORDER BY name"
  );
}

export async function createCategory(data: { name: string; color: string; type: string }) {
  const d = await getDb();
  return d.execute(
    "INSERT INTO categories (name, color, type) VALUES ($1, $2, $3)",
    [data.name, data.color, data.type]
  );
}

export async function updateCategory(id: number, data: { name: string; color: string; type: string }) {
  const d = await getDb();
  return d.execute(
    "UPDATE categories SET name = $1, color = $2, type = $3 WHERE id = $4",
    [data.name, data.color, data.type, id]
  );
}

export async function deleteCategory(id: number) {
  const d = await getDb();
  return d.execute("DELETE FROM categories WHERE id = $1", [id]);
}

// Accounts
export async function getAccounts() {
  const d = await getDb();
  return d.select<Array<{ id: number; name: string; type: string; balance: number }>>(
    "SELECT * FROM accounts ORDER BY name"
  );
}

export async function createAccount(data: { name: string; type: string; balance: number }) {
  const d = await getDb();
  return d.execute(
    "INSERT INTO accounts (name, type, balance) VALUES ($1, $2, $3)",
    [data.name, data.type, data.balance]
  );
}

export async function updateAccount(id: number, data: { name: string; type: string; balance: number }) {
  const d = await getDb();
  return d.execute(
    "UPDATE accounts SET name = $1, type = $2, balance = $3 WHERE id = $4",
    [data.name, data.type, data.balance, id]
  );
}

export async function deleteAccount(id: number) {
  const d = await getDb();
  return d.execute("DELETE FROM accounts WHERE id = $1", [id]);
}

// Transactions
export async function getTransactions(params: {
  month: number;
  year: number;
  type?: string;
  search?: string;
}) {
  const d = await getDb();
  const { start, end } = getMonthRange(params.month, params.year);

  let query = `
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.date >= $1 AND t.date <= $2
  `;
  const args: unknown[] = [start, end];
  let argIdx = 3;

  if (params.type && params.type !== "all") {
    query += ` AND t.type = $${argIdx}`;
    args.push(params.type);
    argIdx++;
  }

  if (params.search) {
    query += ` AND t.description LIKE $${argIdx}`;
    args.push(`%${params.search}%`);
    argIdx++;
  }

  query += " ORDER BY t.date DESC, t.id DESC";

  const rows = await d.select<Array<{
    id: number;
    date: string;
    description: string;
    amount: number;
    type: string;
    category_id: number | null;
    category_name: string | null;
    category_color: string | null;
    account_id: number | null;
    notes: string | null;
  }>>(query, args);

  // Compute totals
  const allRows = await d.select<Array<{ type: string; amount: number }>>(
    `SELECT type, amount FROM transactions WHERE date >= $1 AND date <= $2`,
    [start, end]
  );

  let income = 0;
  let expense = 0;
  for (const r of allRows) {
    if (r.type === "income") income += r.amount;
    else expense += r.amount;
  }

  return {
    data: rows.map((r) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      amount: r.amount,
      type: r.type,
      categoryId: r.category_id,
      categoryName: r.category_name,
      categoryColor: r.category_color,
      accountId: r.account_id,
      notes: r.notes,
    })),
    totals: { income, expense, balance: income - expense, count: allRows.length },
  };
}

export async function createTransaction(data: {
  date: string;
  description: string;
  amount: number;
  type: string;
  categoryId: string | null;
  accountId: string | null;
  notes: string | null;
}) {
  const d = await getDb();
  return d.execute(
    "INSERT INTO transactions (date, description, amount, type, category_id, account_id, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [data.date, data.description, data.amount, data.type, data.categoryId ? Number(data.categoryId) : null, data.accountId ? Number(data.accountId) : null, data.notes]
  );
}

export async function updateTransaction(id: number, data: {
  date: string;
  description: string;
  amount: number;
  type: string;
  categoryId: string | null;
  accountId: string | null;
  notes: string | null;
}) {
  const d = await getDb();
  return d.execute(
    "UPDATE transactions SET date=$1, description=$2, amount=$3, type=$4, category_id=$5, account_id=$6, notes=$7 WHERE id=$8",
    [data.date, data.description, data.amount, data.type, data.categoryId ? Number(data.categoryId) : null, data.accountId ? Number(data.accountId) : null, data.notes, id]
  );
}

export async function deleteTransaction(id: number) {
  const d = await getDb();
  return d.execute("DELETE FROM transactions WHERE id = $1", [id]);
}

export async function bulkDeleteTransactions(scope: string, month: number, year: number) {
  const d = await getDb();
  if (scope === "all") {
    return d.execute("DELETE FROM transactions");
  }
  const { start, end } = getMonthRange(month, year);
  if (scope === "month") {
    return d.execute("DELETE FROM transactions WHERE date >= $1 AND date <= $2", [start, end]);
  }
  // year
  return d.execute(
    "DELETE FROM transactions WHERE date >= $1 AND date <= $2",
    [`${year}-01-01`, `${year}-12-31`]
  );
}

export async function bulkUpdateTransactions(ids: number[], fields: {
  type?: string;
  categoryId?: string;
  accountId?: string;
  date?: string;
}) {
  const d = await getDb();
  for (const id of ids) {
    const sets: string[] = [];
    const args: unknown[] = [];
    let idx = 1;
    if (fields.type) {
      sets.push(`type = $${idx++}`);
      args.push(fields.type);
    }
    if (fields.categoryId !== undefined) {
      const val = fields.categoryId === "_none" ? null : Number(fields.categoryId) || null;
      sets.push(`category_id = $${idx++}`);
      args.push(val);
    }
    if (fields.accountId !== undefined) {
      const val = fields.accountId === "_none" ? null : Number(fields.accountId) || null;
      sets.push(`account_id = $${idx++}`);
      args.push(val);
    }
    if (fields.date) {
      sets.push(`date = $${idx++}`);
      args.push(fields.date);
    }
    if (sets.length > 0) {
      args.push(id);
      await d.execute(`UPDATE transactions SET ${sets.join(", ")} WHERE id = $${idx}`, args);
    }
  }
}

// Bills
export async function getBills(month: number, year: number) {
  const d = await getDb();
  const rows = await d.select<Array<{
    id: number;
    name: string;
    amount: number;
    due_day: number;
    frequency: string;
    is_active: number;
    category_id: number | null;
    category_name: string | null;
    category_color: string | null;
    payment_id: number | null;
    is_paid: number | null;
    paid_at: string | null;
    payment_amount: number | null;
  }>>(
    `SELECT b.*, c.name as category_name, c.color as category_color,
     bp.id as payment_id, bp.is_paid, bp.paid_at, bp.amount as payment_amount
     FROM bills b
     LEFT JOIN categories c ON b.category_id = c.id
     LEFT JOIN bill_payments bp ON bp.bill_id = b.id AND bp.month = $1 AND bp.year = $2
     WHERE b.is_active = 1
     ORDER BY b.due_day ASC`,
    [month, year]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    dueDay: r.due_day,
    frequency: r.frequency,
    isActive: !!r.is_active,
    categoryId: r.category_id,
    categoryName: r.category_name,
    categoryColor: r.category_color,
    paymentId: r.payment_id,
    isPaid: !!r.is_paid,
    paidAt: r.paid_at,
    paymentAmount: r.payment_amount,
  }));
}

export async function createBill(data: {
  name: string;
  amount: number;
  dueDay: number;
  frequency: string;
  categoryId: string | null;
}) {
  const d = await getDb();
  return d.execute(
    "INSERT INTO bills (name, amount, due_day, frequency, category_id) VALUES ($1, $2, $3, $4, $5)",
    [data.name, data.amount, data.dueDay, data.frequency, data.categoryId ? Number(data.categoryId) : null]
  );
}

export async function updateBill(id: number, data: {
  name: string;
  amount: number;
  dueDay: number;
  frequency: string;
  categoryId: string | null;
}) {
  const d = await getDb();
  return d.execute(
    "UPDATE bills SET name=$1, amount=$2, due_day=$3, frequency=$4, category_id=$5 WHERE id=$6",
    [data.name, data.amount, data.dueDay, data.frequency, data.categoryId ? Number(data.categoryId) : null, id]
  );
}

export async function deleteBill(id: number) {
  const d = await getDb();
  return d.execute("DELETE FROM bills WHERE id = $1", [id]);
}

export async function toggleBillPayment(billId: number, month: number, year: number, isPaid: boolean, amount: number) {
  const d = await getDb();
  const existing = await d.select<Array<{ id: number }>>(
    "SELECT id FROM bill_payments WHERE bill_id = $1 AND month = $2 AND year = $3",
    [billId, month, year]
  );
  if (existing.length > 0) {
    await d.execute(
      "UPDATE bill_payments SET is_paid = $1, paid_at = $2, amount = $3 WHERE id = $4",
      [isPaid ? 1 : 0, isPaid ? new Date().toISOString() : null, amount, existing[0].id]
    );
  } else {
    await d.execute(
      "INSERT INTO bill_payments (bill_id, month, year, is_paid, paid_at, amount) VALUES ($1, $2, $3, $4, $5, $6)",
      [billId, month, year, isPaid ? 1 : 0, isPaid ? new Date().toISOString() : null, amount]
    );
  }
}

// Opening Balance
export async function getOpeningBalance(month: number, year: number) {
  const d = await getDb();
  const rows = await d.select<Array<{ amount: number }>>(
    "SELECT amount FROM monthly_opening_balances WHERE month = $1 AND year = $2",
    [month, year]
  );
  return rows.length > 0 ? rows[0].amount : 0;
}

export async function setOpeningBalance(month: number, year: number, amount: number) {
  const d = await getDb();
  const existing = await d.select<Array<{ id: number }>>(
    "SELECT id FROM monthly_opening_balances WHERE month = $1 AND year = $2",
    [month, year]
  );
  if (existing.length > 0) {
    await d.execute(
      "UPDATE monthly_opening_balances SET amount = $1, updated_at = datetime('now') WHERE id = $2",
      [amount, existing[0].id]
    );
  } else {
    await d.execute(
      "INSERT INTO monthly_opening_balances (month, year, amount) VALUES ($1, $2, $3)",
      [month, year, amount]
    );
  }
}

// Dashboard
export async function getDashboardData(month: number, year: number) {
  const d = await getDb();
  const { start, end } = getMonthRange(month, year);

  // Current month totals
  const currentRows = await d.select<Array<{ type: string; total: number }>>(
    "SELECT type, SUM(amount) as total FROM transactions WHERE date >= $1 AND date <= $2 GROUP BY type",
    [start, end]
  );
  const current = { income: 0, expense: 0, balance: 0 };
  for (const r of currentRows) {
    if (r.type === "income") current.income = r.total;
    else current.expense = r.total;
  }
  current.balance = current.income - current.expense;

  // Previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevRange = getMonthRange(prevMonth, prevYear);
  const prevRows = await d.select<Array<{ type: string; total: number }>>(
    "SELECT type, SUM(amount) as total FROM transactions WHERE date >= $1 AND date <= $2 GROUP BY type",
    [prevRange.start, prevRange.end]
  );
  const previous = { income: 0, expense: 0, balance: 0 };
  for (const r of prevRows) {
    if (r.type === "income") previous.income = r.total;
    else previous.expense = r.total;
  }
  previous.balance = previous.income - previous.expense;

  // Expenses by category
  const expensesByCategory = await d.select<Array<{
    category_name: string | null;
    category_color: string | null;
    total: number;
  }>>(
    `SELECT c.name as category_name, c.color as category_color, SUM(t.amount) as total
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.date >= $1 AND t.date <= $2 AND t.type = 'expense'
     GROUP BY t.category_id
     ORDER BY total DESC`,
    [start, end]
  );

  // Recent transactions
  const recentTransactions = await d.select<Array<{
    id: number;
    date: string;
    description: string;
    amount: number;
    type: string;
    category_name: string | null;
    category_color: string | null;
  }>>(
    `SELECT t.id, t.date, t.description, t.amount, t.type,
     c.name as category_name, c.color as category_color
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.date >= $1 AND t.date <= $2
     ORDER BY t.date DESC, t.id DESC
     LIMIT 5`,
    [start, end]
  );

  // Pending bills
  const pendingBills = await d.select<Array<{
    id: number;
    name: string;
    amount: number;
    due_day: number;
    category_name: string | null;
  }>>(
    `SELECT b.id, b.name, b.amount, b.due_day, c.name as category_name
     FROM bills b
     LEFT JOIN categories c ON b.category_id = c.id
     LEFT JOIN bill_payments bp ON bp.bill_id = b.id AND bp.month = $1 AND bp.year = $2
     WHERE b.is_active = 1 AND (bp.is_paid IS NULL OR bp.is_paid = 0)
     ORDER BY b.due_day ASC`,
    [month, year]
  );

  // Monthly balance for last 6 months
  const monthlyBalance: Array<{
    month: number;
    year: number;
    income: number;
    expense: number;
    balance: number;
  }> = [];

  for (let i = 5; i >= 0; i--) {
    let m = month - i;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const range = getMonthRange(m, y);
    const rows = await d.select<Array<{ type: string; total: number }>>(
      "SELECT type, SUM(amount) as total FROM transactions WHERE date >= $1 AND date <= $2 GROUP BY type",
      [range.start, range.end]
    );
    let inc = 0;
    let exp = 0;
    for (const r of rows) {
      if (r.type === "income") inc = r.total;
      else exp = r.total;
    }
    monthlyBalance.push({ month: m, year: y, income: inc, expense: exp, balance: inc - exp });
  }

  return {
    current,
    previous,
    expensesByCategory: expensesByCategory.map((r) => ({
      categoryName: r.category_name,
      categoryColor: r.category_color,
      total: r.total,
    })),
    recentTransactions: recentTransactions.map((r) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      amount: r.amount,
      type: r.type,
      categoryName: r.category_name,
      categoryColor: r.category_color,
    })),
    pendingBills: pendingBills.map((r) => ({
      id: r.id,
      name: r.name,
      amount: r.amount,
      dueDay: r.due_day,
      categoryName: r.category_name,
    })),
    monthlyBalance,
  };
}

function getMonthRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}
