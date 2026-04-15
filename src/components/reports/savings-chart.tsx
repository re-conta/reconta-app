import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
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

export function SavingsChart({ data }: { data: DataPoint[] }) {
  const chartData = data.map((d) => ({
    name: `${MONTH_NAMES[d.month - 1]}/${String(d.year).slice(2)}`,
    Poupanca: d.balance,
    savingsRate: d.income > 0 ? (d.balance / d.income) * 100 : 0,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
            labelStyle={{ color: "#f4f4f5" }}
            formatter={(value, name) => {
              const n = Number(value);
              return name === "Poupanca"
                ? [formatCurrency(n), name] as [string, string]
                : [`${n.toFixed(1)}%`, "Taxa de poupanca"] as [string, string];
            }}
          />
          <ReferenceLine y={0} stroke="#52525b" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="Poupanca" stroke="#10b981" strokeWidth={2} fill="url(#savingsGrad)" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex gap-6 mt-3 text-xs text-zinc-500 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Saldo positivo = dinheiro guardado
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Saldo negativo = gastou mais que ganhou
        </div>
      </div>
    </div>
  );
}
