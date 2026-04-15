import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils";
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount as dbDeleteAccount,
} from "@/lib/database";

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "Conta corrente",
  savings: "Poupanca",
  credit: "Cartao de credito",
  investment: "Investimentos",
};

export function ContasBancariasClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({ name: "", type: "checking", balance: "0" });
  const [saving, setSaving] = useState(false);

  const fetchAccounts = useCallback(() => {
    getAccounts().then(setAccounts);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", type: "checking", balance: "0" });
    setDialogOpen(true);
  }

  function openEdit(acc: Account) {
    setEditing(acc);
    setForm({ name: acc.name, type: acc.type, balance: String(acc.balance) });
    setDialogOpen(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Deseja excluir esta conta?")) return;
    await dbDeleteAccount(id);
    fetchAccounts();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, balance: Number(form.balance) };
    if (editing) {
      await updateAccount(editing.id, data);
    } else {
      await createAccount(data);
    }
    setSaving(false);
    fetchAccounts();
    setDialogOpen(false);
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-indigo-900/20 border border-indigo-800/30 px-4 py-3">
          <p className="text-xs text-zinc-400">Saldo total</p>
          <p className="text-lg font-bold text-indigo-400">{formatCurrency(totalBalance)}</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Nova conta
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5">
          {accounts.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">Nenhuma conta cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-3 rounded-lg p-3 bg-zinc-800/50 border border-zinc-800">
                  <div className="h-9 w-9 rounded-lg bg-indigo-900/50 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{acc.name}</p>
                    <p className="text-xs text-zinc-500">{ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}</p>
                  </div>
                  <p className={`text-sm font-semibold ${acc.balance >= 0 ? "text-zinc-100" : "text-red-400"}`}>
                    {formatCurrency(acc.balance)}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(acc)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDelete(acc.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar conta" : "Nova conta"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input placeholder="Ex: Conta Nubank, Poupanca..." value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="mt-1" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Saldo atual (R$)</Label>
              <Input type="number" step="0.01" placeholder="0,00" value={form.balance} onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
