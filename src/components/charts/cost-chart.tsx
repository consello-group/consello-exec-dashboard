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

const TERRACOTTA = "#A64A30";
const APRICOT    = "#F6D1A3";

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
      className="rounded-lg p-3 text-xs shadow-xl"
      style={{ backgroundColor: "#111111", border: `1px solid ${TERRACOTTA}44` }}
    >
      <p className="font-semibold text-white mb-2">{formattedLabel}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="capitalize" style={{ color: "#6a6a6a" }}>{entry.name}:</span>
          <span className="text-white font-medium">
            {formatCostFull(entry.value)}
          </span>
        </div>
      ))}
      <div className="mt-2 pt-2 flex items-center gap-2" style={{ borderTop: "1px solid #1e1e1e" }}>
        <span style={{ color: "#6a6a6a" }}>Total:</span>
        <span className="text-white font-semibold">{formatCostFull(total)}</span>
      </div>
    </div>
  );
}

export function CostChart({ data, loading = false }: CostChartProps) {
  if (loading) {
    return <Skeleton className="w-full h-[300px] bg-[#1a1a1a]" />;
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
          stroke="#1e1e1e"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={tickFormatter}
          tick={{ fill: "#4a4a4a", fontSize: 11 }}
          axisLine={{ stroke: "#1e1e1e" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatCostAxis}
          tick={{ fill: "#4a4a4a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1a1a1a" }} />
        <Legend
          wrapperStyle={{ paddingTop: "12px", fontSize: "12px", color: "#6a6a6a" }}
          formatter={(value: string) =>
            value === "chatgpt" ? "ChatGPT" : "Claude"
          }
        />
        <Bar
          dataKey="chatgpt"
          name="chatgpt"
          stackId="cost"
          fill={TERRACOTTA}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="claude"
          name="claude"
          stackId="cost"
          fill={APRICOT}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default CostChart;
