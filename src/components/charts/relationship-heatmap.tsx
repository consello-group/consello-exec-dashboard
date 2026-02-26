"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type HealthBucket = "active" | "cooling" | "cold" | "at-risk";

interface CompanyItem {
  id: string;
  name: string;
  healthBucket: HealthBucket;
  daysSinceContact: number | null;
  ownerName: string | null;
}

interface RelationshipHeatmapProps {
  companies: CompanyItem[];
  loading?: boolean;
}

const BUCKET_COLORS: Record<HealthBucket, { bg: string; border: string; text: string }> = {
  active: { bg: "#10a37f22", border: "#10a37f", text: "#10a37f" },
  cooling: { bg: "#f59e0b22", border: "#f59e0b", text: "#f59e0b" },
  cold: { bg: "#f9731622", border: "#f97316", text: "#f97316" },
  "at-risk": { bg: "#ef444422", border: "#ef4444", text: "#ef4444" },
};

const BUCKET_LABELS: Record<HealthBucket, string> = {
  active: "Active",
  cooling: "Cooling",
  cold: "Cold",
  "at-risk": "At Risk",
};

function abbreviate(name: string, maxLen = 14): string {
  if (name.length <= maxLen) return name;
  // Try to abbreviate by removing common words
  const abbreviated = name
    .replace(/\b(Inc|LLC|Ltd|Corp|Co|Group|Holdings|Partners|International)\b\.?/gi, "")
    .trim();
  if (abbreviated.length <= maxLen) return abbreviated;
  return abbreviated.slice(0, maxLen - 1) + "…";
}

interface TooltipState {
  company: CompanyItem;
  x: number;
  y: number;
}

export function RelationshipHeatmap({
  companies,
  loading = false,
}: RelationshipHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg bg-[#1a1a26]" />
        ))}
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[#94a3b8] text-sm">
        No company data available
      </div>
    );
  }

  // Sort: at-risk first, then cold, cooling, active
  const bucketOrder: HealthBucket[] = ["at-risk", "cold", "cooling", "active"];
  const sorted = [...companies].sort(
    (a, b) =>
      bucketOrder.indexOf(a.healthBucket) - bucketOrder.indexOf(b.healthBucket)
  );

  const buckets: HealthBucket[] = ["active", "cooling", "cold", "at-risk"];
  const counts = buckets.reduce<Record<string, number>>((acc, b) => {
    acc[b] = companies.filter((c) => c.healthBucket === b).length;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {buckets.map((bucket) => {
          const colors = BUCKET_COLORS[bucket];
          return (
            <div key={bucket} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: colors.border }}
              />
              <span className="text-[#94a3b8]">
                {BUCKET_LABELS[bucket]}
              </span>
              <span
                className="font-semibold"
                style={{ color: colors.text }}
              >
                ({counts[bucket] ?? 0})
              </span>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div
        className="grid gap-2 relative"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        {sorted.map((company) => {
          const colors = BUCKET_COLORS[company.healthBucket];
          return (
            <div
              key={company.id}
              className={cn(
                "rounded-lg p-2 text-center cursor-default transition-all hover:scale-105",
                "border"
              )}
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
                minHeight: "3.5rem",
              }}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setTooltip({
                  company,
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                });
              }}
            >
              <p
                className="text-xs font-medium leading-tight truncate"
                style={{ color: colors.text }}
              >
                {abbreviate(company.name)}
              </p>
              {company.daysSinceContact !== null && (
                <p className="text-[10px] text-[#94a3b8] mt-0.5">
                  {company.daysSinceContact}d
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-[#2a2a3a] p-3 text-xs shadow-xl"
          style={{
            backgroundColor: "#1a1a26",
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 8}px`,
            transform: "translate(-50%, -100%)",
            maxWidth: "200px",
          }}
        >
          <p className="font-semibold text-[#f1f5f9]">{tooltip.company.name}</p>
          <p className="text-[#94a3b8] mt-0.5">
            Status:{" "}
            <span
              style={{
                color: BUCKET_COLORS[tooltip.company.healthBucket].text,
              }}
            >
              {BUCKET_LABELS[tooltip.company.healthBucket]}
            </span>
          </p>
          {tooltip.company.daysSinceContact !== null && (
            <p className="text-[#94a3b8]">
              Last contact:{" "}
              <span className="text-[#f1f5f9]">
                {tooltip.company.daysSinceContact} days ago
              </span>
            </p>
          )}
          {tooltip.company.ownerName && (
            <p className="text-[#94a3b8]">
              Owner:{" "}
              <span className="text-[#f1f5f9]">{tooltip.company.ownerName}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default RelationshipHeatmap;
