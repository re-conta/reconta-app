import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMonthContext } from "@/components/layout/month-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMonth } from "@/lib/utils";
import { MonthlyBalanceChart } from "@/components/dashboard/monthly-balance-chart";
import { SpendingPieChart } from "@/components/dashboard/spending-pie-chart";
import { getDashboardData } from "@/lib/database";
import { SavingsChart } from "./savings-chart";
import { ComparisonChart } from "./comparison-chart";

interface DashboardData {
  current: { income: number; expense: number; balance: number };
  previous: { income: number; expense: number; balance: number };
  expensesByCategory: Array<{
    categoryName: string | null;
    categoryColor: string | null;
    total: number;
  }>;
  monthlyBalance: Array<{
    month: number;
    year: number;
    income: number;
    expense: number;
    balance: number;
  }>;
}

export function RelatoriosClient() {
  const { month, year, setPeriod } = useMonthContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();

  useEffect(() => {
    setLoading(true);
    getDashboardData(month, year)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [month, year]);

  function prevMonth() {
    if (month === 1) setPeriod(12, year - 1);
    else setPeriod(month - 1, year);
  }
  function nextMonth() {
    if (month === 12) setPeriod(1, year + 1);
    else setPeriod(month + 1, year);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium capitalize min-w-40 text-center text-zinc-100">
          {formatMonth(month, year)}
        </span>
        <Button variant="outline" size="icon" onClick={nextMonth} disabled={isCurrentMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading || !data ? (
        <div className="text-center text-zinc-500 py-12 text-sm">Carregando dados...</div>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>Comparativo com mes anterior</CardTitle></CardHeader>
            <CardContent>
              <ComparisonChart current={data.current} previous={data.previous} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Capacidade de poupanca - ultimos 6 meses</CardTitle>
                <SavingsIndicator balance={data.current.balance} income={data.current.income} />
              </div>
            </CardHeader>
            <CardContent>
              <SavingsChart data={data.monthlyBalance} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Card className="lg:col-span-3">
              <CardHeader><CardTitle>Receitas x Despesas x Saldo</CardTitle></CardHeader>
              <CardContent>
                <MonthlyBalanceChart data={data.monthlyBalance} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Gastos por categoria</CardTitle></CardHeader>
              <CardContent>
                <SpendingPieChart data={data.expensesByCategory} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function SavingsIndicator({ balance, income }: { balance: number; income: number }) {
  if (income === 0) return null;
  const rate = (balance / income) * 100;
  const isPositive = balance >= 0;
  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
      {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      {isPositive ? "+" : ""}{rate.toFixed(1)}% de poupanca
    </div>
  );
}
