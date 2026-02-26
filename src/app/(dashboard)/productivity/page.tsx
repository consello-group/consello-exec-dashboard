export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  buildAdoptionTiers,
  getProductivityConfig,
  calculateUserProductivity,
} from "@/lib/productivity";
import type { UsageInput } from "@/lib/productivity";

// ─── Formatting helpers ───────────────────────────────────────────────────────

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
  sub,
  accentColor,
}: {
  label: string;
  value: string;
  sub?: string;
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
      {sub && (
        <p className="text-xs" style={{ color: "#94a3b8" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, { bg: string; color: string }> = {
  power: { bg: "#6366f1", color: "#f1f5f9" },
  moderate: { bg: "#3b82f6", color: "#f1f5f9" },
  light: { bg: "#10a37f", color: "#f1f5f9" },
  "non-user": { bg: "#2a2a3a", color: "#94a3b8" },
};

function TierBadge({ tier }: { tier: string }) {
  const style = TIER_STYLES[tier] ?? { bg: "#2a2a3a", color: "#94a3b8" };
  const labels: Record<string, string> = {
    power: "Power User",
    moderate: "Moderate",
    light: "Light",
    "non-user": "Non-User",
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {labels[tier] ?? tier}
    </span>
  );
}

// ─── Adoption tier bar (server-rendered) ─────────────────────────────────────

function AdoptionBar({
  tiers,
  total,
}: {
  tiers: { tier: string; count: number; percentage: number }[];
  total: number;
}) {
  const colors: Record<string, string> = {
    power: "#6366f1",
    moderate: "#3b82f6",
    light: "#10a37f",
    "non-user": "#2a2a3a",
  };
  const labels: Record<string, string> = {
    power: "Power",
    moderate: "Moderate",
    light: "Light",
    "non-user": "Non-User",
  };

  return (
    <div className="space-y-3">
      {tiers.map((t) => (
        <div key={t.tier} className="flex items-center gap-3">
          <div className="w-24 text-right text-sm" style={{ color: "#94a3b8" }}>
            {labels[t.tier] ?? t.tier}
          </div>
          <div
            className="flex-1 h-6 rounded-full overflow-hidden"
            style={{ backgroundColor: "#0a0a0f" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${t.percentage}%`,
                backgroundColor: colors[t.tier] ?? "#2a2a3a",
              }}
            />
          </div>
          <div className="w-24 text-sm" style={{ color: "#94a3b8" }}>
            {t.count} users ({t.percentage}%)
          </div>
        </div>
      ))}
      <p className="text-xs pt-1" style={{ color: "#94a3b8" }}>
        Total: {total} users
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductivityPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch raw data
  const [userUsageRaw, users, config, costByPlatform, configRecords] = await Promise.all([
    db.usageRecord.groupBy({
      by: ["userId", "platform"],
      where: { date: { gte: thirtyDaysAgo }, userId: { not: null } },
      _sum: { totalTokens: true },
      _count: { requests: true },
    }),
    db.user.findMany({ where: { isActive: true } }),
    getProductivityConfig(),
    db.costRecord.groupBy({
      by: ["platform"],
      where: { date: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    db.productivityConfig.findMany(),
  ]);

  // Aggregate tokens + requests per userId
  const perUser = new Map<string, { totalTokens: number; requests: number }>();
  for (const row of userUsageRaw) {
    if (!row.userId) continue;
    const existing = perUser.get(row.userId) ?? { totalTokens: 0, requests: 0 };
    existing.totalTokens += Number(row._sum.totalTokens ?? 0);
    existing.requests += row._count.requests ?? 0;
    perUser.set(row.userId, existing);
  }

  // Build UsageInput array (include all active users, even non-users)
  const usageInputs: UsageInput[] = users.map((u) => {
    const usage = perUser.get(u.id) ?? { totalTokens: 0, requests: 0 };
    return {
      userId: u.id,
      email: u.email,
      name: u.name,
      totalTokens: usage.totalTokens,
      requests: usage.requests,
    };
  });

  // Calculate metrics
  const totalAICost = costByPlatform.reduce(
    (sum, r) => sum + Number(r._sum.amount ?? 0),
    0
  );

  const userResults = usageInputs.map((u) => calculateUserProductivity(u, config));
  const activeUsers = userResults.filter((u) => u.conversations > 0).length;
  const totalHoursSaved = userResults.reduce((sum, u) => sum + u.hoursSaved, 0);
  const totalDollarValue = userResults.reduce((sum, u) => sum + u.dollarValue, 0);
  const totalConversations = userResults.reduce((sum, u) => sum + u.conversations, 0);
  const roiRatio = totalAICost > 0 ? totalDollarValue / totalAICost : 0;
  const costPerProductiveHour = totalHoursSaved > 0 ? totalAICost / totalHoursSaved : 0;

  const adoptionTiers = buildAdoptionTiers(userResults);

  // Sort user results by dollar value desc
  const sortedUsers = [...userResults].sort((a, b) => b.dollarValue - a.dollarValue);

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: "#0a0a0f", minHeight: "100vh" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>
          AI Productivity Estimation
        </h1>
        <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
          Estimated business value from AI tool usage &middot; Last 30 days
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Hours Saved"
          value={`${Math.round(totalHoursSaved).toLocaleString()} hrs`}
          sub={`${totalConversations.toLocaleString()} conversations`}
          accentColor="#6366f1"
        />
        <KpiCard
          label="Dollar Value"
          value={formatCost(totalDollarValue)}
          sub={`${activeUsers} active AI users`}
          accentColor="#10a37f"
        />
        <KpiCard
          label="ROI Ratio"
          value={
            totalAICost > 0
              ? `${roiRatio.toFixed(1)}x`
              : "N/A"
          }
          sub={`AI cost: ${formatCost(totalAICost)}`}
          accentColor="#3b82f6"
        />
        <KpiCard
          label="Cost / Productive Hour"
          value={
            totalHoursSaved > 0
              ? formatCost(costPerProductiveHour)
              : "N/A"
          }
          sub="AI spend per hour saved"
          accentColor="#d97706"
        />
      </div>

      {/* Tabs */}
      <div
        className="rounded-xl border p-1"
        style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
      >
        <Tabs defaultValue="overview">
          <div className="px-4 pt-3 pb-1">
            <TabsList
              className="inline-flex gap-1 rounded-lg p-1"
              style={{ backgroundColor: "#0a0a0f" }}
            >
              <TabsTrigger
                value="overview"
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors data-[state=active]:bg-[#1a1a26] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="byuser"
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors data-[state=active]:bg-[#1a1a26] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
              >
                By User
              </TabsTrigger>
              <TabsTrigger
                value="methodology"
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors data-[state=active]:bg-[#1a1a26] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
              >
                Methodology
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4 pt-2 space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "#94a3b8" }}>
                ADOPTION MATURITY
              </h3>
              <AdoptionBar
                tiers={adoptionTiers}
                total={usageInputs.length}
              />
            </div>
            <div
              className="rounded-lg p-4 space-y-2"
              style={{ backgroundColor: "#0a0a0f", border: "1px solid #2a2a3a" }}
            >
              <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>
                Adoption Summary
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {adoptionTiers.map((t) => (
                  <div key={t.tier} className="text-center">
                    <p className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>
                      {t.count}
                    </p>
                    <p className="text-xs capitalize mt-1" style={{ color: "#94a3b8" }}>
                      {t.tier === "non-user" ? "Non-Users" : `${t.tier.charAt(0).toUpperCase() + t.tier.slice(1)} Users`}
                    </p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>
                      {t.percentage}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* By User Tab */}
          <TabsContent value="byuser" className="p-4 pt-2">
            {sortedUsers.length === 0 ? (
              <div className="py-8 text-center" style={{ color: "#94a3b8" }}>
                No user data available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2a2a3a" }}>
                      {["User", "Conversations", "Hours Saved", "Dollar Value", "Tier"].map(
                        (col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left font-medium"
                            style={{ color: "#94a3b8" }}
                          >
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((u, i) => (
                      <tr
                        key={u.userId}
                        style={{
                          backgroundColor: i % 2 === 0 ? "transparent" : "#0f0f18",
                          borderBottom: "1px solid #1e1e2e",
                        }}
                        className="hover:bg-[#1a1a26] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium" style={{ color: "#f1f5f9" }}>
                              {u.name ?? u.email.split("@")[0]}
                            </p>
                            <p className="text-xs" style={{ color: "#94a3b8" }}>
                              {u.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ color: "#f1f5f9" }}>
                          {u.conversations.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: "#f1f5f9" }}>
                          {u.hoursSaved.toFixed(1)} hrs
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: "#10a37f" }}>
                          {formatCost(u.dollarValue)}
                        </td>
                        <td className="px-4 py-3">
                          <TierBadge tier={u.tier} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Methodology Tab */}
          <TabsContent value="methodology" className="p-4 pt-2 space-y-6">
            <div
              className="rounded-lg p-4 space-y-3"
              style={{ backgroundColor: "#0a0a0f", border: "1px solid #2a2a3a" }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
                How Productivity is Calculated
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
                Each user&apos;s AI usage is analyzed over the last 30 days. Conversations are
                estimated from total token count (min 500 tokens per conversation) and request
                count, taking the higher of the two estimates.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
                Conversations are classified by average tokens per conversation:
              </p>
              <ul className="text-sm space-y-1" style={{ color: "#94a3b8" }}>
                <li>
                  <span className="font-medium" style={{ color: "#f1f5f9" }}>Simple</span>
                  {" "}(&lt; 2,000 tokens avg) &rarr;{" "}
                  <span style={{ color: "#10a37f" }}>{config.minutesSavedSimple} min saved</span>
                </li>
                <li>
                  <span className="font-medium" style={{ color: "#f1f5f9" }}>Moderate</span>
                  {" "}(2,000–10,000 tokens avg) &rarr;{" "}
                  <span style={{ color: "#3b82f6" }}>{config.minutesSavedModerate} min saved</span>
                </li>
                <li>
                  <span className="font-medium" style={{ color: "#f1f5f9" }}>Complex</span>
                  {" "}(&gt; 10,000 tokens avg) &rarr;{" "}
                  <span style={{ color: "#6366f1" }}>{config.minutesSavedComplex} min saved</span>
                </li>
              </ul>
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                Dollar value = Hours Saved &times; Hourly Rate (${config.hourlyRate}/hr).
                ROI = Dollar Value &divide; Total AI Cost.
              </p>
            </div>

            {/* Config values */}
            {configRecords.length > 0 && (
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid #2a2a3a" }}
              >
                <div
                  className="px-4 py-3 border-b"
                  style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
                >
                  <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
                    Current Configuration
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2a2a3a", backgroundColor: "#12121a" }}>
                      {["Key", "Label", "Value", "Description"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left font-medium"
                          style={{ color: "#94a3b8" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {configRecords.map((r, i) => (
                      <tr
                        key={r.id}
                        style={{
                          backgroundColor: i % 2 === 0 ? "#0a0a0f" : "#0f0f18",
                          borderBottom: "1px solid #1e1e2e",
                        }}
                      >
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "#94a3b8" }}>
                          {r.key}
                        </td>
                        <td className="px-4 py-3" style={{ color: "#f1f5f9" }}>
                          {r.label}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold" style={{ color: "#10a37f" }}>
                          {r.value}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>
                          {r.description ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
