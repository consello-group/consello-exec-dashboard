"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ModelDistributionProps {
  data: Array<{
    model: string;
    platform: string;
    tokens: number;
    percentage: number;
  }>;
  loading?: boolean;
}

// ChatGPT models → apricot/warm light shades
const CHATGPT_COLORS = ["#F6D1A3", "#E8B87A", "#D4856A", "#C07050", "#AC5C36"];
// Claude models → terracotta/warm dark shades
const CLAUDE_COLORS  = ["#A64A30", "#8B3D26", "#C97A55", "#B06040", "#70301D"];

function getModelColor(platform: string, index: number): string {
  if (platform === "chatgpt") return CHATGPT_COLORS[index % CHATGPT_COLORS.length];
  return CLAUDE_COLORS[index % CLAUDE_COLORS.length];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatModelName(model: string): string {
  return model
    .replace(/^gpt-/, "GPT-")
    .replace(/^claude-/, "Claude ")
    .replace(/-(\d)/, " $1")
    .replace(/-(\w)/g, (_, c: string) => ` ${c.toUpperCase()}`);
}

function CustomTooltip({
  active, payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { model: string; platform: string; tokens: number; percentage: number; color: string } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div
      className="rounded-lg p-3 text-xs shadow-xl"
      style={{ backgroundColor: "#0A0A0A", border: "1px solid #2A2A2A" }}
    >
      <p className="font-semibold text-white mb-1">{formatModelName(item.model)}</p>
      <p style={{ color: "#666666" }}>
        {item.percentage.toFixed(1)}% &middot; {formatTokens(item.tokens)} tokens
      </p>
    </div>
  );
}

export function ModelDistribution({ data, loading = false }: ModelDistributionProps) {
  if (loading) return <Skeleton className="w-full h-[300px] bg-[#1A1A1A]" />;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm" style={{ color: "#666666" }}>
        No model data available
      </div>
    );
  }

  const platformCounters: Record<string, number> = {};
  const coloredData = data.map((item) => {
    const idx = platformCounters[item.platform] ?? 0;
    platformCounters[item.platform] = idx + 1;
    return { ...item, color: getModelColor(item.platform, idx) };
  });

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={coloredData}
            dataKey="tokens"
            nameKey="model"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            strokeWidth={0}
          >
            {coloredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-col gap-1.5 px-1">
        {coloredData.map((item) => (
          <div key={item.model} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2" style={{ color: "#999999" }}>
              <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="truncate">{formatModelName(item.model)}</span>
            </span>
            <span className="text-white font-medium flex-shrink-0 ml-2">
              {item.tokens.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ModelDistribution;
