export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { Users, Zap } from "lucide-react";

const TERRACOTTA  = "#A64A30";
const APRICOT     = "#F6D1A3";
const DARK_BORDER = "#2A2A2A";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, delta, deltaLabel, icon: Icon, accentColor = TERRACOTTA,
}: {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ElementType;
  accentColor?: string;
}) {
  const up = delta !== undefined && delta >= 0;
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden"
      style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
    >
      <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: accentColor, opacity: 0.7 }} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#999999" }}>{label}</span>
        {Icon && <Icon size={15} style={{ color: "#666666" }} />}
      </div>
      <p className="text-3xl font-bold text-white leading-none" style={{ letterSpacing: "-0.02em" }}>{value}</p>
      <div className="flex items-center gap-2 min-h-[18px]">
        {delta !== undefined && (
          <span className="text-xs font-medium" style={{ color: up ? "#4ADE80" : TERRACOTTA }}>
            {up ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        )}
        {deltaLabel && <span className="text-xs" style={{ color: "#666666" }}>{deltaLabel}</span>}
      </div>
    </div>
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────

function TierBadge({ requests }: { requests: number }) {
  let label: string;
  let style: { bg: string; text: string; border: string };

  if (requests >= 300) {
    label = "Power";
    style = { bg: "rgba(166,74,48,0.2)", text: TERRACOTTA, border: "rgba(166,74,48,0.4)" };
  } else if (requests >= 160) {
    label = "Heavy";
    style = { bg: "rgba(246,209,163,0.15)", text: APRICOT, border: "rgba(246,209,163,0.3)" };
  } else if (requests >= 40) {
    label = "Moderate";
    style = { bg: "rgba(100,100,100,0.15)", text: "#AAAAAA", border: "rgba(100,100,100,0.3)" };
  } else if (requests > 0) {
    label = "Light";
    style = { bg: "rgba(60,60,60,0.2)", text: "#777777", border: "rgba(60,60,60,0.4)" };
  } else {
    label = "Inactive";
    style = { bg: "rgba(40,40,40,0.2)", text: "#555555", border: "rgba(40,40,40,0.4)" };
  }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UsersPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [userUsage, userCosts, users] = await Promise.all([
    db.usageRecord.groupBy({
      by: ["userId", "platform"],
      where: { date: { gte: thirtyDaysAgo }, userId: { not: null } },
      _sum: { totalTokens: true, requests: true },
    }),
    db.costRecord.groupBy({
      by: ["userId", "platform"],
      where: { date: { gte: thirtyDaysAgo }, userId: { not: null } },
      _sum: { amount: true },
    }),
    db.user.findMany({ where: { isActive: true } }),
  ]);

  // ── Merge into per-user stats ─────────────────────────────────────────────

  interface UserStat {
    userId: string;
    email: string;
    name: string | null;
    chatgptTokens: number;
    claudeTokens: number;
    totalTokens: number;
    chatgptCost: number;
    claudeCost: number;
    totalCost: number;
    chatgptRequests: number;
    claudeRequests: number;
    totalRequests: number;
  }

  const statsMap = new Map<string, UserStat>();

  for (const u of users) {
    statsMap.set(u.id, {
      userId: u.id, email: u.email, name: u.name,
      chatgptTokens: 0, claudeTokens: 0, totalTokens: 0,
      chatgptCost: 0, claudeCost: 0, totalCost: 0,
      chatgptRequests: 0, claudeRequests: 0, totalRequests: 0,
    });
  }

  for (const row of userUsage) {
    if (!row.userId || !statsMap.has(row.userId)) continue;
    const stat = statsMap.get(row.userId)!;
    const tokens = Number(row._sum.totalTokens ?? 0);
    const reqs   = row._sum.requests ?? 0;
    if (row.platform === "chatgpt") {
      stat.chatgptTokens += tokens;
      stat.chatgptRequests += reqs;
    } else if (row.platform === "claude") {
      stat.claudeTokens += tokens;
      stat.claudeRequests += reqs;
    }
    stat.totalTokens   = stat.chatgptTokens + stat.claudeTokens;
    stat.totalRequests = stat.chatgptRequests + stat.claudeRequests;
  }

  for (const row of userCosts) {
    if (!row.userId || !statsMap.has(row.userId)) continue;
    const stat = statsMap.get(row.userId)!;
    const amt = Number(row._sum.amount ?? 0);
    if (row.platform === "chatgpt") stat.chatgptCost += amt;
    else if (row.platform === "claude") stat.claudeCost += amt;
    stat.totalCost = stat.chatgptCost + stat.claudeCost;
  }

  const stats = Array.from(statsMap.values()).sort((a, b) => b.totalTokens - a.totalTokens);

  const chatgptUserSet = new Set(userUsage.filter(r => r.platform === "chatgpt" && (r._sum.totalTokens ?? 0) > 0).map(r => r.userId));
  const claudeUserSet  = new Set(userUsage.filter(r => r.platform === "claude"  && (r._sum.totalTokens ?? 0) > 0).map(r => r.userId));
  const activeUserCount = new Set([...chatgptUserSet, ...claudeUserSet]).size;
  const totalTokensAll  = stats.reduce((s, u) => s + u.totalTokens, 0);
  const avgTokensPerUser = activeUserCount > 0 ? Math.round(totalTokensAll / activeUserCount) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">User Activity</h1>
        <p className="text-sm mt-1" style={{ color: "#666666" }}>
          Last 30 days &middot; {activeUserCount} active of {users.length} seats
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Active Users" value={String(activeUserCount)} icon={Users} accentColor="#4ADE80" />
        <KpiCard label="ChatGPT Users" value={String(chatgptUserSet.size)} icon={Users} accentColor={APRICOT} />
        <KpiCard label="Claude Users" value={String(claudeUserSet.size)} icon={Users} accentColor={TERRACOTTA} />
        <KpiCard label="Avg Tokens / User" value={formatTokens(avgTokensPerUser)} icon={Zap} accentColor={APRICOT} />
      </div>

      {/* Users Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
      >
        <div className="px-6 py-4" style={{ borderBottom: `1px solid ${DARK_BORDER}` }}>
          <p className="text-sm font-semibold text-white">User Breakdown</p>
          <p className="text-xs mt-0.5" style={{ color: "#666666" }}>Sorted by total token usage</p>
        </div>

        {stats.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "#666666" }}>No user data found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${DARK_BORDER}` }}>
                  {[
                    { label: "User", align: "left" },
                    { label: "ChatGPT", align: "right" },
                    { label: "Claude", align: "right" },
                    { label: "Total Tokens", align: "right" },
                    { label: "Cost", align: "right" },
                    { label: "Messages", align: "right" },
                    { label: "Tier", align: "right" },
                  ].map(({ label, align }) => (
                    <th
                      key={label}
                      className="px-5 py-3 font-semibold uppercase tracking-widest"
                      style={{ textAlign: align as "left" | "right", color: "#666666", fontSize: 11 }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr
                    key={s.userId}
                    style={{
                      borderBottom: `1px solid ${i < stats.length - 1 ? "#1A1A1A" : "transparent"}`,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-white">{s.name ?? s.email.split("@")[0]}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#666666" }}>{s.email}</p>
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums" style={{ color: s.chatgptRequests > 0 ? APRICOT : "#444444" }}>
                      {s.chatgptRequests.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums" style={{ color: s.claudeRequests > 0 ? TERRACOTTA : "#444444" }}>
                      {s.claudeRequests.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-white">
                      {formatTokens(s.totalTokens)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-white">
                      {formatCost(s.totalCost)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums" style={{ color: "#999999" }}>
                      {s.totalRequests.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <TierBadge requests={s.totalRequests} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
