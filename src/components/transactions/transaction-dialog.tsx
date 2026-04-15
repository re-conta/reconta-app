import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getCategories,
  getAccounts,
  createTransaction,
  updateTransaction,
} from "@/lib/database";

interface Category {
  id: number;
  name: string;
  color: string;
  type: string;
}

interface Account {
  id: number;
  name: string;
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: string;
  categoryId: number | null;
  accountId: number | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSaved: () => void;
  defaultMonth: number;
  defaultYear: number;
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export function TransactionDialog({
  open,
  onClose,
  transaction,
  onSaved,
  defaultMonth,
  defaultYear,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({
    date: todayIso(),
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    categoryId: "",
    accountId: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getCategories(), getAccounts()]).then(([cats, accs]) => {
      setCategories(cats);
      setAccounts(accs);
    });
  }, []);

  useEffect(() => {
    if (transaction) {
      setForm({
        date: transaction.date,
        description: transaction.description,
        amount: String(transaction.amount),
        type: transaction.type as "income" | "expense",
        categoryId: transaction.categoryId ? String(transaction.categoryId) : "",
        accountId: transaction.accountId ? String(transaction.accountId) : "",
        notes: transaction.notes ?? "",
      });
    } else {
      const d = new Date(defaultYear, defaultMonth - 1, new Date().getDate());
      setForm({
        date: d.toISOString().split("T")[0],
        description: "",
        amount: "",
        type: "expense",
        categoryId: "",
        accountId: "",
        notes: "",
      });
    }
  }, [transaction, defaultMonth, defaultYear]);

  const filteredCategories = categories.filter(
    (c) => c.type === "both" || c.type === form.type,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      ...form,
      amount: Number(form.amount),
      categoryId: form.categoryId || null,
      accountId: form.accountId || null,
      notes: form.notes || null,
    };
    if (transaction) {
      await updateTransaction(transaction.id, body);
    } else {
      await createTransaction(body);
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Editar lancamento" : "Novo lancamento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-lg overflow-hidden border border-zinc-700">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${form.type === "expense" ? "bg-red-600 text-white" : "bg-transparent text-zinc-400 hover:text-zinc-200"}`}
              onClick={() => setForm((f) => ({ ...f, type: "expense", categoryId: "" }))}
            >
              Despesa
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${form.type === "income" ? "bg-emerald-600 text-white" : "bg-transparent text-zinc-400 hover:text-zinc-200"}`}
              onClick={() => setForm((f) => ({ ...f, type: "income", categoryId: "" }))}
            >
              Receita
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
                className="mt-1"
                style={{ colorScheme: "dark" }}
              />
            </div>
            <div>
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descricao</Label>
            <Input
              id="description"
              placeholder="Ex: Mercado, Salario..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta</Label>
              <Select
                value={form.accountId}
                onValueChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Observacoes</Label>
            <Textarea
              id="notes"
              placeholder="Detalhes opcionais..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : transaction ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
