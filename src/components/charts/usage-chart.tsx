"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

const TERRACOTTA = "#A64A30";
const APRICOT    = "#F6D1A3";

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
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  let formattedLabel = label ?? "";
  try { formattedLabel = format(parseISO(label ?? ""), "MMM d, yyyy"); } catch { /* use raw */ }

  return (
    <div
      className="rounded-lg p-3 text-xs shadow-xl"
      style={{ backgroundColor: "#111111", border: `1px solid ${TERRACOTTA}44` }}
    >
      <p className="font-semibold text-white mb-2">{formattedLabel}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="capitalize" style={{ color: "#6a6a6a" }}>{entry.name}:</span>
          <span className="text-white font-medium">{formatTokenFull(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function UsageChart({ data, loading = false }: UsageChartProps) {
  if (loading) return <Skeleton className="w-full h-[300px] bg-[#1a1a1a]" />;

  const tickFormatter = (value: string) => {
    try { return format(parseISO(value), "MMM d"); } catch { return value; }
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="gradientChatgpt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={TERRACOTTA} stopOpacity={0.25} />
            <stop offset="95%" stopColor={TERRACOTTA} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradientClaude" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={APRICOT} stopOpacity={0.2} />
            <stop offset="95%" stopColor={APRICOT} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={tickFormatter}
          tick={{ fill: "#4a4a4a", fontSize: 11 }}
          axisLine={{ stroke: "#1e1e1e" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatTokenAxis}
          tick={{ fill: "#4a4a4a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: "12px", fontSize: "12px", color: "#6a6a6a" }}
          formatter={(value: string) => value === "chatgpt" ? "ChatGPT" : "Claude"}
        />
        <Area
          type="monotone" dataKey="chatgpt" name="chatgpt"
          stroke={TERRACOTTA} strokeWidth={2}
          fill="url(#gradientChatgpt)" dot={false}
          activeDot={{ r: 4, fill: TERRACOTTA }}
        />
        <Area
          type="monotone" dataKey="claude" name="claude"
          stroke={APRICOT} strokeWidth={2}
          fill="url(#gradientClaude)" dot={false}
          activeDot={{ r: 4, fill: APRICOT }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default UsageChart;
