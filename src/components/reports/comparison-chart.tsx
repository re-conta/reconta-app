import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface MonthData {
  income: number;
  expense: number;
  balance: number;
}

export function ComparisonChart({ current, previous }: { current: MonthData; previous: MonthData }) {
  const data = [
    { name: "Receitas", "Mes atual": current.income, "Mes anterior": previous.income },
    { name: "Despesas", "Mes atual": current.expense, "Mes anterior": previous.expense },
    { name: "Saldo", "Mes atual": current.balance, "Mes anterior": previous.balance },
  ];

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={4} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
            formatter={(value) => formatCurrency(Number(value))}
          />
          <Bar dataKey="Mes anterior" fill="#52525b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Mes atual" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {(["income", "expense", "balance"] as const).map((key) => {
          const label = key === "income" ? "Receitas" : key === "expense" ? "Despesas" : "Saldo";
          const curr = current[key];
          const prev = previous[key];
          const diff = prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
          const isIncrease = curr > prev;
          return (
            <div key={key} className="rounded-lg bg-zinc-800/50 p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">{label}</p>
              <p className="text-sm font-bold text-zinc-100">{formatCurrency(curr)}</p>
              {prev !== 0 && (
                <p className={`text-xs mt-1 ${isIncrease ? (key === "expense" ? "text-red-400" : "text-emerald-400") : key === "expense" ? "text-emerald-400" : "text-red-400"}`}>
                  {isIncrease ? "▲" : "▼"} {Math.abs(diff).toFixed(1)}%
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
