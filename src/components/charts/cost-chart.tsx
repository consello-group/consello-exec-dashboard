"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

interface CostChartProps {
  data: Array<{ date: string; chatgpt: number; claude: number; total: number }>;
  loading?: boolean;
}

function formatCostAxis(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatCostFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  let formattedLabel = label ?? "";
  try {
    formattedLabel = format(parseISO(label ?? ""), "MMM d, yyyy");
  } catch {
    /* use raw label */
  }

  const total = payload.reduce((sum, entry) => sum + (entry.value ?? 0), 0);

  return (
    <div
      className="rounded-lg border border-[#2a2a3a] p-3 text-xs shadow-xl"
      style={{ backgroundColor: "#1a1a26" }}
    >
      <p className="font-semibold text-[#f1f5f9] mb-2">{formattedLabel}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[#94a3b8] capitalize">{entry.name}:</span>
          <span className="text-[#f1f5f9] font-medium">
            {formatCostFull(entry.value)}
          </span>
        </div>
      ))}
      <div className="border-t border-[#2a2a3a] mt-2 pt-2 flex items-center gap-2">
        <span className="text-[#94a3b8]">Total:</span>
        <span className="text-[#f1f5f9] font-semibold">{formatCostFull(total)}</span>
      </div>
    </div>
  );
}

export function CostChart({ data, loading = false }: CostChartProps) {
  if (loading) {
    return <Skeleton className="w-full h-[300px] bg-[#1a1a26]" />;
  }

  const tickFormatter = (value: string) => {
    try {
      return format(parseISO(value), "MMM d");
    } catch {
      return value;
    }
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        barCategoryGap="30%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#2a2a3a"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={tickFormatter}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={{ stroke: "#2a2a3a" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatCostAxis}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1a1a26" }} />
        <Legend
          wrapperStyle={{ paddingTop: "12px", fontSize: "12px", color: "#94a3b8" }}
          formatter={(value: string) =>
            value === "chatgpt" ? "ChatGPT" : "Claude"
          }
        />
        <Bar
          dataKey="chatgpt"
          name="chatgpt"
          stackId="cost"
          fill="#10a37f"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="claude"
          name="claude"
          stackId="cost"
          fill="#d97706"
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default CostChart;
