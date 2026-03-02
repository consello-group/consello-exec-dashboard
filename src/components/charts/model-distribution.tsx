"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
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

// Terracotta shades for ChatGPT models
const CHATGPT_COLORS = [
  "#A64A30",
  "#8B3D26",
  "#70301D",
  "#552414",
  "#3A180D",
];

// Apricot shades for Claude models
const CLAUDE_COLORS = [
  "#F6D1A3",
  "#E8BB80",
  "#DAA55D",
  "#CC8F3A",
  "#BE7917",
];

function getModelColor(platform: string, index: number): string {
  if (platform === "chatgpt") {
    return CHATGPT_COLORS[index % CHATGPT_COLORS.length];
  }
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
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { model: string; platform: string; tokens: number; percentage: number; color: string } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div
      className="rounded-lg p-3 text-xs shadow-xl"
      style={{ backgroundColor: "#111111", border: "1px solid #A64A3044" }}
    >
      <p className="font-semibold text-white mb-1">
        {formatModelName(item.model)}
      </p>
      <p style={{ color: "#6a6a6a" }}>
        {item.percentage.toFixed(1)}% &middot; {formatTokens(item.tokens)} tokens
      </p>
    </div>
  );
}

export function ModelDistribution({ data, loading = false }: ModelDistributionProps) {
  if (loading) {
    return <Skeleton className="w-full h-[300px] bg-[#1a1a1a]" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm" style={{ color: "#6a6a6a" }}>
        No model data available
      </div>
    );
  }

  // Track per-platform index for color assignment
  const platformCounters: Record<string, number> = {};
  const coloredData = data.map((item) => {
    const idx = platformCounters[item.platform] ?? 0;
    platformCounters[item.platform] = idx + 1;
    return { ...item, color: getModelColor(item.platform, idx) };
  });

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={coloredData}
            dataKey="tokens"
            nameKey="model"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            strokeWidth={2}
            stroke="#080808"
          >
            {coloredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 px-2">
        {coloredData.map((item) => (
          <li
            key={item.model}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-white truncate flex-1">
              {formatModelName(item.model)}
            </span>
            <span className="flex-shrink-0" style={{ color: "#6a6a6a" }}>
              {item.percentage.toFixed(1)}%
            </span>
            <span className="flex-shrink-0 hidden sm:block" style={{ color: "#6a6a6a" }}>
              {formatTokens(item.tokens)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ModelDistribution;
