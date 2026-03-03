"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const TERRACOTTA  = "#A64A30";
const DARK_BORDER = "#2A2A2A";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  loading?: boolean;
  className?: string;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  delta,
  deltaLabel,
  icon,
  accentColor = TERRACOTTA,
  loading = false,
  className,
}: KpiCardProps) {
  const [hovered, setHovered] = useState(false);

  if (loading) {
    return (
      <div
        className={cn("rounded-xl p-5 flex flex-col gap-3", className)}
        style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
      >
        <Skeleton className="h-3 w-24 bg-[#1A1A1A]" />
        <Skeleton className="h-8 w-32 bg-[#1A1A1A]" />
        <Skeleton className="h-3 w-20 bg-[#1A1A1A]" />
      </div>
    );
  }

  const deltaPositive = delta !== undefined && delta >= 0;

  return (
    <div
      className={cn("rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden", className)}
      style={{
        backgroundColor: "#111111",
        border: `1px solid ${hovered ? accentColor : DARK_BORDER}`,
        transition: "border-color 0.2s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top accent bar */}
      <span
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: accentColor, opacity: 0.7 }}
      />

      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-semibold uppercase tracking-widest leading-tight"
          style={{ color: "#999999" }}
        >
          {title}
        </span>
        {icon && (
          <span style={{ color: "#666666" }}>{icon}</span>
        )}
      </div>

      <p className="text-3xl font-bold text-white leading-none" style={{ letterSpacing: "-0.02em" }}>
        {value}
      </p>

      <div className="flex items-center gap-2 min-h-[18px]">
        {delta !== undefined && (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-medium"
            style={{ color: deltaPositive ? "#4ADE80" : TERRACOTTA }}
          >
            {deltaPositive ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        )}
        {(subtitle || deltaLabel) && (
          <span className="text-xs" style={{ color: "#666666" }}>
            {subtitle ?? deltaLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export type { KpiCardProps };
