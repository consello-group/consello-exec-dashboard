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

interface PipelineStage {
  stageLabel: string;
  dealCount: number;
  totalAmount: number;
  probability: number;
}

interface PipelineData {
  pipelineLabel: string;
  stages: PipelineStage[];
}

interface PipelineFunnelProps {
  pipelines: PipelineData[];
  loading?: boolean;
}

// HubSpot orange gradient — lighter to darker
const STAGE_COLORS = [
  "#ffb8a0",
  "#ff9e7a",
  "#ff8560",
  "#ff7a59",
  "#e86040",
  "#cc4a2c",
  "#a83520",
  "#842215",
];

function formatAmount(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: Record<string, number>;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-[#2a2a3a] p-3 text-xs shadow-xl max-w-xs"
      style={{ backgroundColor: "#1a1a26" }}
    >
      <p className="font-semibold text-[#f1f5f9] mb-2">{label}</p>
      {payload.map((entry) => {
        const amountKey = `${entry.name}_amount`;
        const countKey = `${entry.name}_count`;
        const amount = entry.payload[amountKey] ?? 0;
        const count = entry.payload[countKey] ?? 0;
        return (
          <div key={entry.name} className="mb-1">
            <p className="text-[#ff7a59] font-medium truncate">{entry.name}</p>
            <p className="text-[#94a3b8]">
              {count} deals &middot; {formatAmount(amount)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function PipelineFunnel({ pipelines, loading = false }: PipelineFunnelProps) {
  if (loading) {
    return <Skeleton className="w-full h-[300px] bg-[#1a1a26]" />;
  }

  if (!pipelines || pipelines.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-[#94a3b8] text-sm">
        No pipeline data available
      </div>
    );
  }

  // Flatten pipelines into chart-friendly rows
  // Each row = one pipeline; each bar segment = one stage
  const allStageLabels = Array.from(
    new Set(
      pipelines.flatMap((p) => p.stages.map((s) => s.stageLabel))
    )
  );

  const chartData = pipelines.map((pipeline) => {
    const row: Record<string, string | number> = {
      pipelineLabel: pipeline.pipelineLabel,
    };
    pipeline.stages.forEach((stage) => {
      row[stage.stageLabel] = stage.dealCount;
      row[`${stage.stageLabel}_amount`] = stage.totalAmount;
      row[`${stage.stageLabel}_count`] = stage.dealCount;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, pipelines.length * 60 + 60)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 120, bottom: 5 }}
        barSize={24}
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
          dataKey="pipelineLabel"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={115}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1a1a26" }} />
        {allStageLabels.map((stageLabel, idx) => (
          <Bar
            key={stageLabel}
            dataKey={stageLabel}
            stackId="pipeline"
            fill={STAGE_COLORS[idx % STAGE_COLORS.length]}
            radius={
              idx === allStageLabels.length - 1 ? [0, 4, 4, 0] : undefined
            }
          >
            {chartData.map((_, rowIdx) => (
              <Cell
                key={`cell-${rowIdx}`}
                fill={STAGE_COLORS[idx % STAGE_COLORS.length]}
              />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default PipelineFunnel;
