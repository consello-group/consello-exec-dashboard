"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

// ChatGPT = apricot (light), Claude = terracotta (dark)
const CHATGPT = "#F6D1A3";
const CLAUDE  = "#A64A30";

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
      style={{ backgroundColor: "#0A0A0A", border: "1px solid #2A2A2A" }}
    >
      <p className="font-semibold text-white mb-2">{formattedLabel}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="capitalize" style={{ color: "#666666" }}>
            {entry.name === "chatgpt" ? "ChatGPT" : "Claude"}:
          </span>
          <span className="text-white font-medium">{formatTokenFull(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function UsageChart({ data, loading = false }: UsageChartProps) {
  if (loading) return <Skeleton className="w-full h-[260px] bg-[#1A1A1A]" />;

  const tickFormatter = (value: string) => {
    try { return format(parseISO(value), "MMM d"); } catch { return value; }
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barGap={1}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={tickFormatter}
          tick={{ fill: "#666666", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          tickFormatter={formatTokenAxis}
          tick={{ fill: "#666666", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="chatgpt" name="chatgpt" stackId="a" fill={CHATGPT} radius={[0, 0, 0, 0]} />
        <Bar dataKey="claude" name="claude" stackId="a" fill={CLAUDE} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default UsageChart;
