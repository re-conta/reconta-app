import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import type { PieSectorShapeProps } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface DataPoint {
  categoryName: string | null;
  categoryColor: string | null;
  total: number;
}

export function SpendingPieChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
        Nenhuma despesa registrada
      </div>
    );
  }

  const chartData = data
    .filter((d) => d.total > 0)
    .slice(0, 8)
    .map((d) => ({
      name: d.categoryName ?? "Sem categoria",
      value: d.total,
      color: d.categoryColor ?? "#6b7280",
    }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  const renderSector = (props: PieSectorShapeProps) => (
    <Sector
      cx={props.cx}
      cy={props.cy}
      innerRadius={props.innerRadius}
      outerRadius={props.outerRadius}
      startAngle={props.startAngle}
      endAngle={props.endAngle}
      fill={props.payload.color}
    />
  );

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            shape={renderSector}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
            formatter={(value) => formatCurrency(Number(value))}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="w-full space-y-1.5 mt-2">
        {chartData.slice(0, 5).map((d) => (
          <li key={d.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-zinc-400 truncate max-w-30">{d.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-zinc-300">{formatCurrency(d.value)}</span>
              <span className="text-zinc-600">{((d.value / total) * 100).toFixed(0)}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
