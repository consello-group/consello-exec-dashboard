import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
  accentColor = "#6366f1",
  loading = false,
  className,
}: KpiCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-[#2a2a3a] bg-[#12121a] p-5 flex flex-col gap-3",
          className
        )}
      >
        <Skeleton className="h-4 w-24 bg-[#1a1a26]" />
        <Skeleton className="h-8 w-32 bg-[#1a1a26]" />
        <Skeleton className="h-3 w-20 bg-[#1a1a26]" />
      </div>
    );
  }

  const deltaPositive = delta !== undefined && delta >= 0;
  const deltaColor = deltaPositive ? "#10a37f" : "#ef4444";
  const deltaSign = deltaPositive ? "+" : "";

  return (
    <div
      className={cn(
        "rounded-xl border border-[#2a2a3a] bg-[#12121a] p-5 flex flex-col gap-2 relative overflow-hidden",
        className
      )}
    >
      {/* Left accent bar */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-[#94a3b8] leading-tight">
          {title}
        </span>
        {icon && (
          <span
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}33` }}
          >
            <span style={{ color: accentColor }}>{icon}</span>
          </span>
        )}
      </div>

      <p className="text-2xl font-bold text-[#f1f5f9] leading-none">
        {value}
      </p>

      <div className="flex items-center gap-2 min-h-[18px]">
        {delta !== undefined && (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
            style={{
              color: deltaColor,
              backgroundColor: `${deltaColor}22`,
            }}
          >
            {deltaSign}{delta}%
          </span>
        )}
        {(subtitle || deltaLabel) && (
          <span className="text-xs text-[#94a3b8]">
            {subtitle ?? deltaLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export type { KpiCardProps };
