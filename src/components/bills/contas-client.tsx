import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatMonth } from "@/lib/utils";
import { BillDialog } from "./bill-dialog";
import {
  getBills,
  toggleBillPayment,
  deleteBill as dbDeleteBill,
} from "@/lib/database";

interface Bill {
  id: number;
  name: string;
  amount: number;
  dueDay: number;
  frequency: "monthly" | "annual";
  isActive: boolean;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  paymentId: number | null;
  isPaid: boolean;
  paidAt: string | null;
  paymentAmount: number | null;
}

export function ContasClient({
  initialMonth,
  initialYear,
}: {
  initialMonth: number;
  initialYear: number;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const today = new Date();
  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();

  const fetchBills = useCallback(() => {
    setLoading(true);
    getBills(month, year).then((d) => {
      setBills(d as Bill[]);
      setLoading(false);
    });
  }, [month, year]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  async function togglePaid(bill: Bill) {
    await toggleBillPayment(bill.id, month, year, !bill.isPaid, bill.amount);
    fetchBills();
  }

  async function deleteBill(id: number) {
    if (!confirm("Deseja excluir esta conta fixa?")) return;
    await dbDeleteBill(id);
    fetchBills();
  }

  const paid = bills.filter((b) => b.isPaid);
  const unpaid = bills.filter((b) => !b.isPaid);
  const totalPaid = paid.reduce((s, b) => s + (b.paymentAmount ?? b.amount), 0);
  const totalUnpaid = unpaid.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium capitalize min-w-28 text-center text-zinc-100">
            {formatMonth(month, year)}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} disabled={isCurrentMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button className="ml-auto" size="sm" onClick={() => { setEditingBill(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          Nova conta fixa
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-emerald-900/20 border border-emerald-800/30 p-4">
          <p className="text-xs text-zinc-400 mb-1">Pagas ({paid.length})</p>
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-lg bg-amber-900/20 border border-amber-800/30 p-4">
          <p className="text-xs text-zinc-400 mb-1">Pendentes ({unpaid.length})</p>
          <p className="text-lg font-bold text-amber-400">{formatCurrency(totalUnpaid)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-8 text-sm">Carregando...</div>
      ) : bills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-zinc-500 text-sm mb-3">Nenhuma conta fixa cadastrada.</p>
            <Button onClick={() => { setEditingBill(null); setDialogOpen(true); }} variant="outline">
              <Plus className="h-4 w-4" />
              Adicionar primeira conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...unpaid, ...paid].map((bill) => {
            const dueDate = new Date(year, month - 1, bill.dueDay);
            const isOverdue = !bill.isPaid && dueDate < today;
            const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const isDueSoon = !bill.isPaid && daysUntilDue <= 3 && daysUntilDue >= 0;

            return (
              <div
                key={bill.id}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                  bill.isPaid
                    ? "border-zinc-800 bg-zinc-900/50 opacity-60"
                    : isOverdue
                      ? "border-red-800/50 bg-red-900/10"
                      : isDueSoon
                        ? "border-amber-800/50 bg-amber-900/10"
                        : "border-zinc-800 bg-zinc-900"
                }`}
              >
                <button
                  type="button"
                  onClick={() => togglePaid(bill)}
                  className="shrink-0 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {bill.isPaid ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  ) : isOverdue ? (
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  ) : (
                    <Circle className="h-6 w-6" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium ${bill.isPaid ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                      {bill.name}
                    </p>
                    {bill.frequency === "annual" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/30">Anual</span>
                    )}
                    {bill.categoryName && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${bill.categoryColor}22`, color: bill.categoryColor ?? "#6366f1" }}
                      >
                        {bill.categoryName}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-400" : isDueSoon ? "text-amber-400" : "text-zinc-500"}`}>
                    Vence dia {bill.dueDay}
                    {isOverdue ? " - Atrasada!" : isDueSoon ? ` - Vence em ${daysUntilDue} dia(s)` : ""}
                    {bill.isPaid && bill.paidAt ? ` - Pago em ${new Date(bill.paidAt).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className={`font-bold ${bill.isPaid ? "text-zinc-500" : "text-zinc-100"}`}>
                    {formatCurrency(bill.paymentAmount ?? bill.amount)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant={bill.isPaid ? "outline" : "default"}
                    size="sm"
                    className={`text-xs h-7 ${bill.isPaid ? "text-zinc-400" : ""}`}
                    onClick={() => togglePaid(bill)}
                  >
                    {bill.isPaid ? "Desfazer" : "Pagar"}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingBill(bill); setDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => deleteBill(bill.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BillDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingBill(null); }}
        bill={editingBill}
        onSaved={fetchBills}
      />
    </div>
  );
}
