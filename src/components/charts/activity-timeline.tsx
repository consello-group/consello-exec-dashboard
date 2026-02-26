"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Phone, Mail, Calendar, FileText, CheckSquare, MessageSquare } from "lucide-react";

interface ActivityItem {
  id: string;
  type: string;
  ownerName: string | null;
  companyName: string | null;
  occurredAt: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  loading?: boolean;
}

type ActivityType = "meeting" | "call" | "email" | "note" | "task";

const TYPE_CONFIG: Record<
  ActivityType,
  { color: string; bg: string; icon: React.ReactNode; label: string }
> = {
  meeting: {
    color: "#3b82f6",
    bg: "#3b82f622",
    icon: <Calendar size={12} />,
    label: "Meeting",
  },
  call: {
    color: "#10a37f",
    bg: "#10a37f22",
    icon: <Phone size={12} />,
    label: "Call",
  },
  email: {
    color: "#f59e0b",
    bg: "#f59e0b22",
    icon: <Mail size={12} />,
    label: "Email",
  },
  note: {
    color: "#94a3b8",
    bg: "#94a3b822",
    icon: <FileText size={12} />,
    label: "Note",
  },
  task: {
    color: "#8b5cf6",
    bg: "#8b5cf622",
    icon: <CheckSquare size={12} />,
    label: "Task",
  },
};

function getTypeConfig(type: string) {
  const key = type.toLowerCase() as ActivityType;
  return (
    TYPE_CONFIG[key] ?? {
      color: "#6b7280",
      bg: "#6b728022",
      icon: <MessageSquare size={12} />,
      label: type,
    }
  );
}

function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function ActivityTimeline({
  activities,
  loading = false,
}: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-6 h-6 rounded-full bg-[#1a1a26] flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-48 bg-[#1a1a26]" />
              <Skeleton className="h-3 w-32 bg-[#1a1a26]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[#94a3b8] text-sm">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, idx) => {
        const config = getTypeConfig(activity.type);
        const isLast = idx === activities.length - 1;

        return (
          <div key={activity.id} className="flex items-start gap-3 group">
            {/* Dot + line */}
            <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: config.bg, color: config.color }}
              >
                {config.icon}
              </span>
              {!isLast && (
                <span className="w-px h-4 bg-[#2a2a3a] mt-0.5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-xs font-medium"
                  style={{ color: config.color }}
                >
                  {config.label}
                </span>
                {activity.ownerName && (
                  <>
                    <span className="text-[#2a2a3a] text-xs">·</span>
                    <span className="text-xs text-[#f1f5f9]">
                      {activity.ownerName}
                    </span>
                  </>
                )}
                {activity.companyName && (
                  <>
                    <span className="text-[#2a2a3a] text-xs">→</span>
                    <span className="text-xs text-[#94a3b8] truncate">
                      {activity.companyName}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-[#94a3b8] mt-0.5">
                {formatRelativeTime(activity.occurredAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ActivityTimeline;

// ─── ActivityByOwnerChart ─────────────────────────────────────────────────────

interface OwnerActivity {
  ownerId: string;
  ownerName: string;
  count: number;
}

interface ActivityByOwnerChartProps {
  data: OwnerActivity[];
}

export function ActivityByOwnerChart({ data }: ActivityByOwnerChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[#94a3b8] text-sm">
        No activity data
      </div>
    );
  }

  const max = data[0]?.count ?? 1;

  return (
    <div className="space-y-2">
      {data.map((owner) => {
        const barPct = Math.round((owner.count / max) * 100);
        return (
          <div key={owner.ownerId} className="flex items-center gap-3">
            <span
              className="text-sm w-32 truncate flex-shrink-0 text-right"
              style={{ color: "#94a3b8" }}
            >
              {owner.ownerName}
            </span>
            <div
              className="flex-1 h-7 rounded-md overflow-hidden"
              style={{ backgroundColor: "#0a0a0f" }}
            >
              <div
                className="h-full rounded-md flex items-center px-2 transition-all"
                style={{
                  width: `${barPct}%`,
                  backgroundColor: "#ff7a59",
                  minWidth: "2.5rem",
                }}
              >
                <span className="text-xs font-medium text-white">
                  {owner.count}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ActivityTrendsChart ──────────────────────────────────────────────────────

interface WeeklyData {
  week: string;
  count: number;
}

interface ActivityTrendsChartProps {
  data: WeeklyData[];
}

export function ActivityTrendsChart({ data }: ActivityTrendsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[#94a3b8] text-sm">
        No trend data
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 160;
  const barWidth = Math.floor(100 / data.length) - 1;

  return (
    <div className="space-y-3">
      {/* Bar chart using divs */}
      <div
        className="flex items-end gap-1 px-2"
        style={{ height: `${chartHeight}px` }}
      >
        {data.map((d, i) => {
          const barHeightPct = max > 0 ? (d.count / max) * 100 : 0;
          const barHeightPx = (barHeightPct / 100) * chartHeight;
          return (
            <div
              key={i}
              className="flex flex-col items-center justify-end flex-1 group relative"
              style={{ height: "100%" }}
            >
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${barHeightPx}px`,
                  backgroundColor: d.count > 0 ? "#ff7a59" : "#2a2a3a",
                  minHeight: d.count > 0 ? "4px" : "0",
                }}
                title={`${d.week}: ${d.count} activities`}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels — show every other */}
      <div className="flex gap-1 px-2">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 text-center"
            style={{ fontSize: "10px", color: i % 2 === 0 ? "#94a3b8" : "transparent" }}
          >
            {d.week}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex gap-6 pt-1">
        <div>
          <p className="text-xs" style={{ color: "#94a3b8" }}>
            Peak week
          </p>
          <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
            {data.reduce((best, d) => (d.count > best.count ? d : best), data[0])?.week} (
            {max})
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "#94a3b8" }}>
            Avg / week
          </p>
          <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
            {Math.round(data.reduce((s, d) => s + d.count, 0) / data.length)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "#94a3b8" }}>
            Total (12 wks)
          </p>
          <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
            {data.reduce((s, d) => s + d.count, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
