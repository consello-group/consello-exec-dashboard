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

// Green shades for ChatGPT models
const CHATGPT_COLORS = [
  "#10a37f",
  "#0d8a6a",
  "#0a7156",
  "#075841",
  "#053f2e",
];

// Amber shades for Claude models
const CLAUDE_COLORS = [
  "#d97706",
  "#b45309",
  "#92400e",
  "#78350f",
  "#5a2709",
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
      className="rounded-lg border border-[#2a2a3a] p-3 text-xs shadow-xl"
      style={{ backgroundColor: "#1a1a26" }}
    >
      <p className="font-semibold text-[#f1f5f9] mb-1">
        {formatModelName(item.model)}
      </p>
      <p className="text-[#94a3b8]">
        {item.percentage.toFixed(1)}% &middot; {formatTokens(item.tokens)} tokens
      </p>
    </div>
  );
}

export function ModelDistribution({ data, loading = false }: ModelDistributionProps) {
  if (loading) {
    return <Skeleton className="w-full h-[300px] bg-[#1a1a26]" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-[#94a3b8] text-sm">
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
            stroke="#0a0a0f"
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
            <span className="text-[#f1f5f9] truncate flex-1">
              {formatModelName(item.model)}
            </span>
            <span className="text-[#94a3b8] flex-shrink-0">
              {item.percentage.toFixed(1)}%
            </span>
            <span className="text-[#94a3b8] flex-shrink-0 hidden sm:block">
              {formatTokens(item.tokens)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ModelDistribution;
