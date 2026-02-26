export const dynamic = "force-dynamic";

import { db } from "@/lib/db";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: string;
  accentColor: string;
}) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-2"
      style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <span className="text-sm font-medium" style={{ color: "#94a3b8" }}>
          {label}
        </span>
      </div>
      <p className="text-3xl font-bold tracking-tight" style={{ color: "#f1f5f9" }}>
        {value}
      </p>
    </div>
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────

function TierBadge({ tokens }: { tokens: number }) {
  let label = "Low";
  let color = "#94a3b8";
  let bg = "#1a1a26";

  if (tokens >= 500_000) {
    label = "Power";
    color = "#f1f5f9";
    bg = "#6366f1";
  } else if (tokens >= 100_000) {
    label = "Active";
    color = "#f1f5f9";
    bg = "#3b82f6";
  } else if (tokens >= 10_000) {
    label = "Regular";
    color = "#f1f5f9";
    bg = "#10a37f";
  }

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: bg, color }}
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
      _sum: { totalTokens: true },
      _count: { requests: true },
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
  }

  const statsMap = new Map<string, UserStat>();

  for (const u of users) {
    statsMap.set(u.id, {
      userId: u.id,
      email: u.email,
      name: u.name,
      chatgptTokens: 0,
      claudeTokens: 0,
      totalTokens: 0,
      chatgptCost: 0,
      claudeCost: 0,
      totalCost: 0,
      chatgptRequests: 0,
      claudeRequests: 0,
    });
  }

  for (const row of userUsage) {
    if (!row.userId) continue;
    if (!statsMap.has(row.userId)) continue;
    const stat = statsMap.get(row.userId)!;
    const tokens = Number(row._sum.totalTokens ?? 0);
    const reqs = row._count.requests ?? 0;
    if (row.platform === "chatgpt") {
      stat.chatgptTokens += tokens;
      stat.chatgptRequests += reqs;
    } else if (row.platform === "claude") {
      stat.claudeTokens += tokens;
      stat.claudeRequests += reqs;
    }
    stat.totalTokens = stat.chatgptTokens + stat.claudeTokens;
  }

  for (const row of userCosts) {
    if (!row.userId) continue;
    if (!statsMap.has(row.userId)) continue;
    const stat = statsMap.get(row.userId)!;
    const amt = Number(row._sum.amount ?? 0);
    if (row.platform === "chatgpt") stat.chatgptCost += amt;
    else if (row.platform === "claude") stat.claudeCost += amt;
    stat.totalCost = stat.chatgptCost + stat.claudeCost;
  }

  const stats = Array.from(statsMap.values()).sort((a, b) => b.totalTokens - a.totalTokens);

  // ── KPI calculations ──────────────────────────────────────────────────────

  const chatgptUserSet = new Set(
    userUsage.filter((r) => r.platform === "chatgpt" && (r._sum.totalTokens ?? 0) > 0).map((r) => r.userId)
  );
  const claudeUserSet = new Set(
    userUsage.filter((r) => r.platform === "claude" && (r._sum.totalTokens ?? 0) > 0).map((r) => r.userId)
  );
  const activeUserCount = new Set([...chatgptUserSet, ...claudeUserSet]).size;

  const totalTokensAll = stats.reduce((sum, s) => sum + s.totalTokens, 0);
  const avgTokensPerUser =
    activeUserCount > 0 ? Math.round(totalTokensAll / activeUserCount) : 0;

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: "#0a0a0f", minHeight: "100vh" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>
          User Activity
        </h1>
        <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
          Last 30 days &middot; {users.length} active users tracked
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Active Users"
          value={String(activeUserCount)}
          accentColor="#6366f1"
        />
        <KpiCard
          label="ChatGPT Users"
          value={String(chatgptUserSet.size)}
          accentColor="#10a37f"
        />
        <KpiCard
          label="Claude Users"
          value={String(claudeUserSet.size)}
          accentColor="#d97706"
        />
        <KpiCard
          label="Avg Tokens / User"
          value={formatTokens(avgTokensPerUser)}
          accentColor="#3b82f6"
        />
      </div>

      {/* Users Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: "#2a2a3a" }}>
          <h2 className="text-base font-semibold" style={{ color: "#f1f5f9" }}>
            User Breakdown
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
            Sorted by total token usage
          </p>
        </div>

        {stats.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "#94a3b8" }}>
            No user data found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a3a" }}>
                  {["User", "ChatGPT Tokens", "Claude Tokens", "Total Tokens", "Cost", "Requests", "Tier"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-5 py-3 text-left font-medium"
                        style={{ color: "#94a3b8" }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr
                    key={s.userId}
                    style={{
                      backgroundColor: i % 2 === 0 ? "#12121a" : "#0f0f18",
                      borderBottom: "1px solid #1e1e2e",
                    }}
                    className="hover:bg-[#1a1a26] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium" style={{ color: "#f1f5f9" }}>
                          {s.name ?? s.email.split("@")[0]}
                        </p>
                        <p className="text-xs" style={{ color: "#94a3b8" }}>
                          {s.email}
                        </p>
                      </div>
                    </td>
                    <td
                      className="px-5 py-3 font-mono"
                      style={{ color: s.chatgptTokens > 0 ? "#10a37f" : "#94a3b8" }}
                    >
                      {formatTokens(s.chatgptTokens)}
                    </td>
                    <td
                      className="px-5 py-3 font-mono"
                      style={{ color: s.claudeTokens > 0 ? "#d97706" : "#94a3b8" }}
                    >
                      {formatTokens(s.claudeTokens)}
                    </td>
                    <td className="px-5 py-3 font-mono font-semibold" style={{ color: "#f1f5f9" }}>
                      {formatTokens(s.totalTokens)}
                    </td>
                    <td className="px-5 py-3 font-mono" style={{ color: "#f1f5f9" }}>
                      {formatCost(s.totalCost)}
                    </td>
                    <td className="px-5 py-3" style={{ color: "#94a3b8" }}>
                      {(s.chatgptRequests + s.claudeRequests).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <TierBadge tokens={s.totalTokens} />
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
