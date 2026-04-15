import { Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory as dbDeleteCategory,
} from "@/lib/database";

interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  type: string;
}

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#14b8a6", "#a855f7",
  "#64748b", "#22c55e",
];

export function CategoriasClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", color: COLORS[0], type: "expense" as string });
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", color: COLORS[0], type: "expense" });
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({ name: cat.name, color: cat.color, type: cat.type });
    setDialogOpen(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Deseja excluir esta categoria?")) return;
    await dbDeleteCategory(id);
    fetchCategories();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await updateCategory(editing.id, form);
    } else {
      await createCategory(form);
    }
    setSaving(false);
    fetchCategories();
    setDialogOpen(false);
  }

  const income = categories.filter((c) => c.type === "income");
  const expense = categories.filter((c) => c.type === "expense");
  const both = categories.filter((c) => c.type === "both");

  function CategoryList({ cats, label }: { cats: Category[]; label: string }) {
    if (cats.length === 0) return null;
    return (
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{label}</h3>
        <div className="space-y-1">
          {cats.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 rounded-lg p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
              <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="flex-1 text-zinc-200 text-sm">{cat.name}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDelete(cat.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <Button onClick={openNew}>
        <Plus className="h-4 w-4" />
        Nova categoria
      </Button>

      <Card>
        <CardContent className="pt-5 space-y-6">
          <CategoryList cats={income} label="Receitas" />
          <CategoryList cats={expense} label="Despesas" />
          <CategoryList cats={both} label="Receitas e despesas" />
          {categories.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-4">Nenhuma categoria cadastrada.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Alimentacao, Salario..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="both">Receita e Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-7 w-7 rounded-full transition-transform hover:scale-110 cursor-pointer ${form.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                  />
                ))}
              </div>
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
