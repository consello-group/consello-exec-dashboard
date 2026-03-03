"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

// ChatGPT = apricot (light), Claude = terracotta (dark)
const CHATGPT = "#F6D1A3";
const CLAUDE  = "#A64A30";

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
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
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

  const total = payload.reduce((sum, e) => sum + (e.value ?? 0), 0);

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
          <span className="text-white font-medium">{formatCostFull(entry.value)}</span>
        </div>
      ))}
      <div className="mt-2 pt-2 flex items-center gap-2" style={{ borderTop: "1px solid #2A2A2A" }}>
        <span style={{ color: "#666666" }}>Total:</span>
        <span className="text-white font-semibold">{formatCostFull(total)}</span>
      </div>
    </div>
  );
}

export function CostChart({ data, loading = false }: CostChartProps) {
  if (loading) return <Skeleton className="w-full h-[260px] bg-[#1A1A1A]" />;

  const tickFormatter = (value: string) => {
    try { return format(parseISO(value), "MMM d"); } catch { return value; }
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="gChatgpt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHATGPT} stopOpacity={0.3} />
            <stop offset="100%" stopColor={CHATGPT} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gClaude" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CLAUDE} stopOpacity={0.3} />
            <stop offset="100%" stopColor={CLAUDE} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          tickFormatter={formatCostAxis}
          tick={{ fill: "#666666", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="chatgpt" name="chatgpt"
          stroke={CHATGPT} fill="url(#gChatgpt)" strokeWidth={2} dot={false}
          activeDot={{ r: 4, fill: CHATGPT }}
        />
        <Area type="monotone" dataKey="claude" name="claude"
          stroke={CLAUDE} fill="url(#gClaude)" strokeWidth={2} dot={false}
          activeDot={{ r: 4, fill: CLAUDE }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default CostChart;
