import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const TERRACOTTA = "#A64A30";
const APRICOT    = "#F6D1A3";

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
  if (loading) {
    return (
      <div
        className={cn("rounded-xl p-5 flex flex-col gap-3", className)}
        style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}
      >
        <Skeleton className="h-3 w-24 bg-[#1a1a1a]" />
        <Skeleton className="h-8 w-32 bg-[#1a1a1a]" />
        <Skeleton className="h-3 w-20 bg-[#1a1a1a]" />
      </div>
    );
  }

  const deltaPositive = delta !== undefined && delta >= 0;
  const deltaSign = deltaPositive ? "+" : "";

  return (
    <div
      className={cn("rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden", className)}
      style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}
    >
      {/* Left accent bar */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-start justify-between gap-2">
        <span
          className="text-xs font-medium uppercase tracking-wider leading-tight"
          style={{ color: "#5a5a5a" }}
        >
          {title}
        </span>
        {icon && (
          <span
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}18` }}
          >
            <span style={{ color: accentColor }}>{icon}</span>
          </span>
        )}
      </div>

      <p className="text-2xl font-bold text-white leading-none tracking-tight">
        {value}
      </p>

      <div className="flex items-center gap-2 min-h-[18px]">
        {delta !== undefined && (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              color: deltaPositive ? APRICOT : "#ef4444",
              backgroundColor: deltaPositive ? `${TERRACOTTA}22` : "#ef444422",
            }}
          >
            {deltaSign}{delta}%
          </span>
        )}
        {(subtitle || deltaLabel) && (
          <span className="text-xs" style={{ color: "#5a5a5a" }}>
            {subtitle ?? deltaLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export type { KpiCardProps };
