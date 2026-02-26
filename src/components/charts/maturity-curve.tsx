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

interface MaturityCurveProps {
  data: Array<{
    week: string;
    power: number;
    moderate: number;
    light: number;
    nonUser: number;
  }>;
  loading?: boolean;
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

  const tierLabels: Record<string, string> = {
    power: "Power Users",
    moderate: "Moderate",
    light: "Light",
    nonUser: "Non-users",
  };

  return (
    <div
      className="rounded-lg border border-[#2a2a3a] p-3 text-xs shadow-xl"
      style={{ backgroundColor: "#1a1a26" }}
    >
      <p className="font-semibold text-[#f1f5f9] mb-2">{label}</p>
      {[...payload].reverse().map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[#94a3b8]">
            {tierLabels[entry.name] ?? entry.name}:
          </span>
          <span className="text-[#f1f5f9] font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

const tierLabels: Record<string, string> = {
  power: "Power Users",
  moderate: "Moderate",
  light: "Light",
  nonUser: "Non-users",
};

export function MaturityCurve({ data, loading = false }: MaturityCurveProps) {
  if (loading) {
    return <Skeleton className="w-full h-[300px] bg-[#1a1a26]" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-[#94a3b8] text-sm">
        No maturity data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        stackOffset="expand"
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        <defs>
          <linearGradient id="gradPower" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10a37f" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#10a37f" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="gradModerate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="gradLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="gradNonUser" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#374151" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#374151" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#2a2a3a"
          vertical={false}
        />
        <XAxis
          dataKey="week"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={{ stroke: "#2a2a3a" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: "12px", fontSize: "12px", color: "#94a3b8" }}
          formatter={(value: string) => tierLabels[value] ?? value}
        />
        <Area
          type="monotone"
          dataKey="nonUser"
          name="nonUser"
          stackId="1"
          stroke="#374151"
          strokeWidth={1}
          fill="url(#gradNonUser)"
        />
        <Area
          type="monotone"
          dataKey="light"
          name="light"
          stackId="1"
          stroke="#f59e0b"
          strokeWidth={1}
          fill="url(#gradLight)"
        />
        <Area
          type="monotone"
          dataKey="moderate"
          name="moderate"
          stackId="1"
          stroke="#3b82f6"
          strokeWidth={1}
          fill="url(#gradModerate)"
        />
        <Area
          type="monotone"
          dataKey="power"
          name="power"
          stackId="1"
          stroke="#10a37f"
          strokeWidth={1}
          fill="url(#gradPower)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default MaturityCurve;
