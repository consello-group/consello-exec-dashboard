"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface AdoptionChartProps {
  data: Array<{ tier: string; count: number; percentage: number }>;
  loading?: boolean;
}

const TIER_COLORS: Record<string, string> = {
  "Power Users": "#10a37f",
  "Moderate": "#3b82f6",
  "Light": "#f59e0b",
  "Non-users": "#6b7280",
};

function getTierColor(tier: string): string {
  return TIER_COLORS[tier] ?? "#6366f1";
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-[#2a2a3a] p-3 text-xs shadow-xl"
      style={{ backgroundColor: "#1a1a26" }}
    >
      <p className="font-semibold text-[#f1f5f9] mb-1">{label}</p>
      <p className="text-[#94a3b8]">
        {payload[0].value} users
      </p>
    </div>
  );
}

export function AdoptionChart({ data, loading = false }: AdoptionChartProps) {
  if (loading) {
    return <Skeleton className="w-full h-[200px] bg-[#1a1a26]" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-[#94a3b8] text-sm">
        No adoption data available
      </div>
    );
  }

  // Sort by predefined tier order
  const tierOrder = ["Power Users", "Moderate", "Light", "Non-users"];
  const sorted = [...data].sort(
    (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  );

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 5, right: 40, left: 80, bottom: 5 }}
        barSize={20}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#2a2a3a"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="tier"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={75}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1a1a26" }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {sorted.map((entry) => (
            <Cell
              key={entry.tier}
              fill={getTierColor(entry.tier)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default AdoptionChart;
