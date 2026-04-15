import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface DataPoint {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
}

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function MonthlyBalanceChart({ data }: { data: DataPoint[] }) {
  const chartData = data.map((d) => ({
    name: `${MONTH_NAMES[d.month - 1]}/${String(d.year).slice(2)}`,
    Receitas: d.income,
    Despesas: d.expense,
    Saldo: d.balance,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} barGap={2} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
          labelStyle={{ color: "#f4f4f5" }}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
        <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Saldo" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
