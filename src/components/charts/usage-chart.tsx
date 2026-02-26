"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

interface UsageChartProps {
  data: Array<{ date: string; chatgpt: number; claude: number; total: number }>;
  loading?: boolean;
}

function formatTokenAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function formatTokenFull(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
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

  return (
    <div
      className="rounded-lg border border-[#2a2a3a] p-3 text-xs shadow-xl"
      style={{ backgroundColor: "#1a1a26" }}
    >
      <p className="font-semibold text-[#f1f5f9] mb-2">{formattedLabel}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[#94a3b8] capitalize">{entry.name}:</span>
          <span className="text-[#f1f5f9] font-medium">
            {formatTokenFull(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function UsageChart({ data, loading = false }: UsageChartProps) {
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
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="gradientChatgpt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10a37f" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10a37f" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="gradientClaude" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#d97706" stopOpacity={0.03} />
          </linearGradient>
        </defs>
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
          tickFormatter={formatTokenAxis}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: "12px", fontSize: "12px", color: "#94a3b8" }}
          formatter={(value: string) =>
            value === "chatgpt" ? "ChatGPT" : "Claude"
          }
        />
        <Area
          type="monotone"
          dataKey="chatgpt"
          name="chatgpt"
          stroke="#10a37f"
          strokeWidth={2}
          fill="url(#gradientChatgpt)"
          dot={false}
          activeDot={{ r: 4, fill: "#10a37f" }}
        />
        <Area
          type="monotone"
          dataKey="claude"
          name="claude"
          stroke="#d97706"
          strokeWidth={2}
          fill="url(#gradientClaude)"
          dot={false}
          activeDot={{ r: 4, fill: "#d97706" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default UsageChart;
