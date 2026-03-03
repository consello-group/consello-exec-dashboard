export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  buildAdoptionTiers,
  getProductivityConfig,
  calculateUserProductivity,
} from "@/lib/productivity";
import type { UsageInput } from "@/lib/productivity";

const TERRACOTTA  = "#A64A30";
const APRICOT     = "#F6D1A3";
const DARK_BORDER = "#2A2A2A";

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
      className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden"
      style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
    >
      <span
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: accentColor, opacity: 0.7 }}
      />
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#999999" }}>
        {label}
      </span>
      <p className="text-3xl font-bold text-white leading-none" style={{ letterSpacing: "-0.02em" }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: "#666666" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  power:      { bg: "rgba(166,74,48,0.2)",   text: TERRACOTTA, border: "rgba(166,74,48,0.4)"   },
  moderate:   { bg: "rgba(246,209,163,0.15)", text: APRICOT,    border: "rgba(246,209,163,0.3)" },
  light:      { bg: "rgba(100,100,100,0.15)", text: "#AAAAAA",  border: "rgba(100,100,100,0.3)" },
  "non-user": { bg: "rgba(40,40,40,0.2)",     text: "#555555",  border: "rgba(40,40,40,0.4)"    },
};

function TierBadge({ tier }: { tier: string }) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES["non-user"];
  const labels: Record<string, string> = {
    power: "Power User",
    moderate: "Moderate",
    light: "Light",
    "non-user": "Non-User",
  };
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
      {labels[tier] ?? tier}
    </span>
  );
}

// ─── Adoption tier bar ────────────────────────────────────────────────────────

function AdoptionBar({
  tiers,
  total,
}: {
  tiers: { tier: string; count: number; percentage: number }[];
  total: number;
}) {
  const colors: Record<string, string> = {
    power:      TERRACOTTA,
    moderate:   "#D4856A",
    light:      "#666666",
    "non-user": "#333333",
  };
  const labels: Record<string, string> = {
    power: "Power",
    moderate: "Moderate",
    light: "Light",
    "non-user": "Non-User",
  };

  return (
    <div className="space-y-2.5">
      {tiers.map((t) => (
        <div key={t.tier} className="flex items-center gap-3">
          <span className="w-24 text-right text-xs" style={{ color: "#999999" }}>
            {labels[t.tier] ?? t.tier}
          </span>
          <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ backgroundColor: "#1A1A1A" }}>
            <div
              className="h-full rounded-md"
              style={{
                width: `${t.percentage}%`,
                backgroundColor: colors[t.tier] ?? "#333333",
              }}
            />
          </div>
          <span className="w-28 text-xs" style={{ color: "#666666" }}>
            {t.count} users ({t.percentage}%)
          </span>
        </div>
      ))}
      <p className="text-xs pt-1 pl-[108px]" style={{ color: "#555555" }}>
        Total: {total} users
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductivityPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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

  const perUser = new Map<string, { totalTokens: number; requests: number }>();
  for (const row of userUsageRaw) {
    if (!row.userId) continue;
    const existing = perUser.get(row.userId) ?? { totalTokens: 0, requests: 0 };
    existing.totalTokens += Number(row._sum.totalTokens ?? 0);
    existing.requests += row._count.requests ?? 0;
    perUser.set(row.userId, existing);
  }

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
  const sortedUsers = [...userResults].sort((a, b) => b.dollarValue - a.dollarValue);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">AI Productivity Estimation</h1>
        <p className="text-sm mt-1" style={{ color: "#666666" }}>
          Estimated business value from AI tool usage &middot; Last 30 days
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Hours Saved"
          value={`${Math.round(totalHoursSaved).toLocaleString()} hrs`}
          sub={`${totalConversations.toLocaleString()} conversations`}
          accentColor="#4ADE80"
        />
        <KpiCard
          label="Dollar Value"
          value={formatCost(totalDollarValue)}
          sub={`${activeUsers} active AI users`}
          accentColor={APRICOT}
        />
        <KpiCard
          label="ROI Ratio"
          value={totalAICost > 0 ? `${roiRatio.toFixed(1)}x` : "N/A"}
          sub={`AI cost: ${formatCost(totalAICost)}`}
          accentColor={TERRACOTTA}
        />
        <KpiCard
          label="Cost / Productive Hour"
          value={totalHoursSaved > 0 ? formatCost(costPerProductiveHour) : "N/A"}
          sub="AI spend per hour saved"
          accentColor={TERRACOTTA}
        />
      </div>

      {/* Tabs */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
      >
        <Tabs defaultValue="overview">
          <div className="px-5 pt-4 pb-0" style={{ borderBottom: `1px solid ${DARK_BORDER}` }}>
            <TabsList
              className="inline-flex gap-0.5 rounded-lg p-0.5 mb-4"
              style={{ backgroundColor: "#1A1A1A" }}
            >
              {["overview", "byuser", "methodology"].map((v) => (
                <TabsTrigger
                  key={v}
                  value={v}
                  className="rounded-md px-4 py-1.5 text-xs font-medium transition-all data-[state=active]:bg-[#0A0A0A] data-[state=active]:text-white text-[#666666]"
                >
                  {v === "overview" ? "Overview" : v === "byuser" ? "By User" : "Methodology"}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="p-6 space-y-6">
            <div>
              <p className="text-sm font-semibold text-white mb-1">Adoption Maturity</p>
              <p className="text-xs mb-5" style={{ color: "#666666" }}>
                User tiers based on conversation volume &middot; last 30 days
              </p>
              <AdoptionBar tiers={adoptionTiers} total={usageInputs.length} />
            </div>

            <div
              className="rounded-lg p-5"
              style={{ backgroundColor: "#0A0A0A", border: `1px solid ${DARK_BORDER}` }}
            >
              <p className="text-sm font-semibold text-white mb-4">Adoption Summary</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {adoptionTiers.map((t) => {
                  const style = TIER_STYLES[t.tier] ?? TIER_STYLES["non-user"];
                  return (
                    <div key={t.tier} className="text-center">
                      <p className="text-2xl font-bold text-white">{t.count}</p>
                      <p className="text-xs mt-1" style={{ color: style.text }}>
                        {t.tier === "non-user"
                          ? "Non-Users"
                          : `${t.tier.charAt(0).toUpperCase() + t.tier.slice(1)} Users`}
                      </p>
                      <p className="text-xs" style={{ color: "#555555" }}>{t.percentage}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* By User Tab */}
          <TabsContent value="byuser" className="p-0">
            {sortedUsers.length === 0 ? (
              <div className="py-8 text-center" style={{ color: "#666666" }}>
                No user data available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${DARK_BORDER}` }}>
                      {["User", "Conversations", "Hours Saved", "Dollar Value", "Tier"].map((col) => (
                        <th
                          key={col}
                          className="px-5 py-3 text-left font-semibold uppercase tracking-widest"
                          style={{ color: "#666666", fontSize: 11 }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((u, i) => (
                      <tr
                        key={u.userId}
                        style={{
                          borderBottom: `1px solid ${i < sortedUsers.length - 1 ? "#1A1A1A" : "transparent"}`,
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td className="px-5 py-3">
                          <p className="font-semibold text-white">{u.name ?? u.email.split("@")[0]}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#666666" }}>{u.email}</p>
                        </td>
                        <td className="px-5 py-3 tabular-nums" style={{ color: "#999999" }}>
                          {u.conversations.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 tabular-nums font-medium text-white">
                          {u.hoursSaved.toFixed(1)} hrs
                        </td>
                        <td className="px-5 py-3 tabular-nums font-semibold" style={{ color: "#4ADE80" }}>
                          {formatCost(u.dollarValue)}
                        </td>
                        <td className="px-5 py-3">
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
          <TabsContent value="methodology" className="p-6 space-y-4">
            <div
              className="rounded-lg p-5 space-y-3"
              style={{ backgroundColor: "#0A0A0A", border: `1px solid ${DARK_BORDER}` }}
            >
              <p className="text-sm font-semibold text-white">How Productivity is Calculated</p>
              <p className="text-sm leading-relaxed" style={{ color: "#999999" }}>
                Each user&apos;s AI usage is analyzed over the last 30 days. Conversations are
                estimated from total token count (min 500 tokens per conversation) and request
                count, taking the higher of the two estimates.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#999999" }}>
                Conversations are classified by average tokens per conversation:
              </p>
              <ul className="text-sm space-y-1.5" style={{ color: "#999999" }}>
                <li>
                  <span className="font-medium text-white">Simple</span>
                  {" "}(&lt; 2,000 tokens avg) &rarr;{" "}
                  <span style={{ color: APRICOT }}>{config.minutesSavedSimple} min saved</span>
                </li>
                <li>
                  <span className="font-medium text-white">Moderate</span>
                  {" "}(2,000–10,000 tokens avg) &rarr;{" "}
                  <span style={{ color: "#D4856A" }}>{config.minutesSavedModerate} min saved</span>
                </li>
                <li>
                  <span className="font-medium text-white">Complex</span>
                  {" "}(&gt; 10,000 tokens avg) &rarr;{" "}
                  <span style={{ color: TERRACOTTA }}>{config.minutesSavedComplex} min saved</span>
                </li>
              </ul>
              <p className="text-sm" style={{ color: "#999999" }}>
                Dollar value = Hours Saved &times; Hourly Rate (${config.hourlyRate}/hr).
                ROI = Dollar Value &divide; Total AI Cost.
              </p>
            </div>

            {configRecords.length > 0 && (
              <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${DARK_BORDER}` }}>
                <div className="px-5 py-3" style={{ borderBottom: `1px solid ${DARK_BORDER}` }}>
                  <p className="text-sm font-semibold text-white">Current Configuration</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${DARK_BORDER}` }}>
                      {["Key", "Label", "Value", "Description"].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left font-semibold uppercase tracking-widest"
                          style={{ color: "#666666", fontSize: 11 }}
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
                          borderBottom: `1px solid ${i < configRecords.length - 1 ? "#1A1A1A" : "transparent"}`,
                        }}
                      >
                        <td className="px-5 py-3 font-mono text-xs" style={{ color: "#666666" }}>
                          {r.key}
                        </td>
                        <td className="px-5 py-3 text-white">{r.label}</td>
                        <td className="px-5 py-3 font-mono font-semibold" style={{ color: APRICOT }}>
                          {r.value}
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: "#666666" }}>
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
