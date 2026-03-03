export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { Zap, DollarSign, Users, Flame } from "lucide-react";
import { PlatformActivity } from "@/components/charts/platform-activity";
import { ModelDistribution } from "@/components/charts/model-distribution";

const TERRACOTTA  = "#A64A30";
const APRICOT     = "#F6D1A3";
const DARK_BORDER = "#2A2A2A";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatTokens(n: bigint | number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
}

function formatCost(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatDate(d: Date | null): string {
  if (!d) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
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

// ─── Adoption tier bar ────────────────────────────────────────────────────────

function AdoptionTierBar({
  label, count, pct, total, color,
}: {
  label: string; count: number; pct: number; total: number; color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-right text-xs" style={{ color: "#999999" }}>{label}</span>
      <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ backgroundColor: "#1A1A1A" }}>
        <div
          className="h-full rounded-md"
          style={{ width: `${(count / total) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-28 text-xs" style={{ color: "#666666" }}>{count} users ({pct}%)</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AIOverviewPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    usageByPlatform, costByPlatform, lastSyncs,
    dailyUsageRaw, dailyCostsRaw, modelUsageRaw,
    chatgptUsers, claudeUsers,
    dauRaw, perUserRequests,
  ] = await Promise.all([
    db.usageRecord.groupBy({
      by: ["platform"],
      where: { date: { gte: thirtyDaysAgo } },
      _sum: { totalTokens: true },
      _count: { requests: true },
    }),
    db.costRecord.groupBy({
      by: ["platform"],
      where: { date: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    db.syncLog.findMany({
      where: { status: "success" },
      orderBy: { syncedAt: "desc" },
      distinct: ["platform"],
    }),
    db.usageRecord.groupBy({
      by: ["date", "platform"],
      where: { date: { gte: thirtyDaysAgo } },
      _sum: { totalTokens: true },
      orderBy: { date: "asc" },
    }),
    db.costRecord.groupBy({
      by: ["date", "platform"],
      where: { date: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
      orderBy: { date: "asc" },
    }),
    db.usageRecord.groupBy({
      by: ["model", "platform"],
      where: { date: { gte: thirtyDaysAgo } },
      _sum: { totalTokens: true },
      orderBy: { _sum: { totalTokens: "desc" } },
    }),
    db.usageRecord.findMany({
      where: { platform: "chatgpt", date: { gte: thirtyDaysAgo }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    db.usageRecord.findMany({
      where: { platform: "claude", date: { gte: thirtyDaysAgo }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    // DAU: unique users per day
    db.usageRecord.findMany({
      where: { date: { gte: thirtyDaysAgo }, userId: { not: null } },
      select: { date: true, userId: true },
      distinct: ["date", "userId"],
    }),
    // Per-user request totals for adoption tiers
    db.usageRecord.groupBy({
      by: ["userId"],
      where: { date: { gte: thirtyDaysAgo }, userId: { not: null } },
      _sum: { requests: true },
    }),
  ]);

  // ── KPI calculations ──────────────────────────────────────────────────────
  const getUsage = (p: string) => usageByPlatform.find((u) => u.platform === p);
  const getCost  = (p: string) => costByPlatform.find((c) => c.platform === p);

  const chatgptTokens = BigInt(getUsage("chatgpt")?._sum.totalTokens ?? 0);
  const claudeTokens  = BigInt(getUsage("claude")?._sum.totalTokens ?? 0);
  const totalTokens   = chatgptTokens + claudeTokens;
  const chatgptCost   = Number(getCost("chatgpt")?._sum.amount ?? 0);
  const claudeCost    = Number(getCost("claude")?._sum.amount ?? 0);
  const totalCost     = chatgptCost + claudeCost;
  const activeUsers   = new Set([...chatgptUsers.map(u => u.userId), ...claudeUsers.map(u => u.userId)]).size;
  const lastSync      = lastSyncs[0]?.syncedAt ?? null;

  // ── Usage data ────────────────────────────────────────────────────────────
  const usageMap = new Map<string, { chatgpt: number; claude: number }>();
  for (const row of dailyUsageRaw) {
    const key = (row.date as Date).toISOString().slice(0, 10);
    if (!usageMap.has(key)) usageMap.set(key, { chatgpt: 0, claude: 0 });
    const e = usageMap.get(key)!;
    const t = Number(row._sum.totalTokens ?? 0);
    if (row.platform === "chatgpt") e.chatgpt += t;
    else if (row.platform === "claude") e.claude += t;
  }
  const usageData = Array.from(usageMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, chatgpt: v.chatgpt, claude: v.claude, total: v.chatgpt + v.claude }));

  // ── Cost data ─────────────────────────────────────────────────────────────
  const costMap = new Map<string, { chatgpt: number; claude: number }>();
  for (const row of dailyCostsRaw) {
    const key = (row.date as Date).toISOString().slice(0, 10);
    if (!costMap.has(key)) costMap.set(key, { chatgpt: 0, claude: 0 });
    const e = costMap.get(key)!;
    const amt = Number(row._sum.amount ?? 0);
    if (row.platform === "chatgpt") e.chatgpt += amt;
    else if (row.platform === "claude") e.claude += amt;
  }
  const costData = Array.from(costMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, chatgpt: v.chatgpt, claude: v.claude, total: v.chatgpt + v.claude }));

  // ── DAU data ──────────────────────────────────────────────────────────────
  const dauMap = new Map<string, Set<string>>();
  for (const row of dauRaw) {
    const key = (row.date as Date).toISOString().slice(0, 10);
    if (!dauMap.has(key)) dauMap.set(key, new Set());
    if (row.userId) dauMap.get(key)!.add(row.userId);
  }
  const dauData = Array.from(dauMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, users]) => ({ date, dau: users.size }));

  // ── Model distribution ────────────────────────────────────────────────────
  const totalModelTokens = modelUsageRaw.reduce((s, r) => s + Number(r._sum.totalTokens ?? 0), 0);
  const modelData = modelUsageRaw.map((r) => {
    const tokens = Number(r._sum.totalTokens ?? 0);
    return { model: r.model, platform: r.platform, tokens, percentage: totalModelTokens > 0 ? Math.round((tokens / totalModelTokens) * 1000) / 10 : 0 };
  });

  // ── Adoption tiers ────────────────────────────────────────────────────────
  const tierThresholds = { power: 300, heavy: 160, moderate: 40 };
  let power = 0, heavy = 0, moderate = 0, light = 0;
  for (const row of perUserRequests) {
    const reqs = row._sum.requests ?? 0;
    if (reqs >= tierThresholds.power) power++;
    else if (reqs >= tierThresholds.heavy) heavy++;
    else if (reqs >= tierThresholds.moderate) moderate++;
    else if (reqs > 0) light++;
  }
  const tierTotal = power + heavy + moderate + light;
  const pct = (n: number) => tierTotal > 0 ? Math.round((n / tierTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">AI Usage Overview</h1>
        <p className="text-sm mt-1" style={{ color: "#666666" }}>
          Last 30 days &middot; Updated {formatDate(lastSync)}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Tokens" value={formatTokens(totalTokens)} icon={Zap} accentColor={APRICOT} />
        <KpiCard label="Total Cost" value={formatCost(totalCost)} icon={DollarSign} accentColor={TERRACOTTA} />
        <KpiCard label="Active Users" value={String(activeUsers)} icon={Users} accentColor="#4ADE80" />
        <KpiCard
          label="ChatGPT Tokens" value={formatTokens(chatgptTokens)}
          deltaLabel={formatCost(chatgptCost)}
          icon={Zap} accentColor={APRICOT}
        />
        <KpiCard
          label="Claude Tokens" value={formatTokens(claudeTokens)}
          deltaLabel={formatCost(claudeCost)}
          icon={Zap} accentColor={TERRACOTTA}
        />
      </div>

      {/* Charts: Platform Activity (2/3) + Model Distribution (1/3) */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "2fr 1fr" }}>
        {/* Platform Activity */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
        >
          <PlatformActivity usageData={usageData} costData={costData} dauData={dauData} />
        </div>

        {/* Model Distribution */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
        >
          <p className="text-sm font-semibold text-white mb-4">Model Distribution</p>
          {modelData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: "#666666" }}>
              No model data available
            </div>
          ) : (
            <ModelDistribution data={modelData} />
          )}
        </div>
      </div>

      {/* Adoption Maturity */}
      {tierTotal > 0 && (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-white">Adoption Maturity</p>
              <p className="text-xs mt-0.5" style={{ color: "#666666" }}>
                User tiers based on message volume &middot; last 30 days
              </p>
            </div>
            <div className="flex gap-4">
              {[
                { label: "Power", count: power, color: TERRACOTTA },
                { label: "Heavy", count: heavy, color: APRICOT },
                { label: "Moderate", count: moderate, color: "#D4856A" },
                { label: "Light", count: light, color: "#444444" },
              ].map(t => (
                <span key={t.label} className="flex items-center gap-1.5 text-xs" style={{ color: "#999999" }}>
                  <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: t.color }} />
                  {t.label} ({t.count})
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2.5">
            <AdoptionTierBar label="Power" count={power} pct={pct(power)} total={tierTotal} color={TERRACOTTA} />
            <AdoptionTierBar label="Heavy" count={heavy} pct={pct(heavy)} total={tierTotal} color={APRICOT} />
            <AdoptionTierBar label="Moderate" count={moderate} pct={pct(moderate)} total={tierTotal} color="#D4856A" />
            <AdoptionTierBar label="Light" count={light} pct={pct(light)} total={tierTotal} color="#444444" />
          </div>
        </div>
      )}

      {/* Power Users callout */}
      {power > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(166,74,48,0.15)" }}
              >
                <Flame size={20} color={TERRACOTTA} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {power} Power User{power !== 1 ? "s" : ""} identified
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#666666" }}>
                  300+ messages/month across AI platforms
                </p>
              </div>
            </div>
            <a
              href="/users"
              className="text-xs font-medium px-4 py-2 rounded-full transition-colors"
              style={{
                border: `1px solid ${DARK_BORDER}`,
                color: "#ffffff",
                textDecoration: "none",
              }}
            >
              View Power Users →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
