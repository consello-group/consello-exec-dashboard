export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UsageChart } from "@/components/charts/usage-chart";
import { CostChart } from "@/components/charts/cost-chart";
import { ModelDistribution } from "@/components/charts/model-distribution";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatTokens(n: bigint | number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
}

function formatCost(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function formatDate(d: Date | null): string {
  if (!d) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AIOverviewPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Parallel fetches
  const [usageByPlatform, costByPlatform, lastSyncs, dailyUsageRaw, dailyCostsRaw, modelUsageRaw, chatgptUserCount, claudeUserCount] =
    await Promise.all([
      db.usageRecord.groupBy({
        by: ["platform"],
        where: { date: { gte: thirtyDaysAgo } },
        _sum: { totalTokens: true, inputTokens: true, outputTokens: true },
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
    ]);

  // ── KPI calculations ──────────────────────────────────────────────────────

  const getUsage = (p: string) => usageByPlatform.find((u) => u.platform === p);
  const getCost = (p: string) => costByPlatform.find((c) => c.platform === p);

  const chatgptTokens = BigInt(getUsage("chatgpt")?._sum.totalTokens ?? 0);
  const claudeTokens = BigInt(getUsage("claude")?._sum.totalTokens ?? 0);
  const totalTokens = chatgptTokens + claudeTokens;

  const chatgptCost = Number(getCost("chatgpt")?._sum.amount ?? 0);
  const claudeCost = Number(getCost("claude")?._sum.amount ?? 0);
  const totalCost = chatgptCost + claudeCost;

  const allUserIds = new Set([
    ...chatgptUserCount.map((u) => u.userId),
    ...claudeUserCount.map((u) => u.userId),
  ]);
  const activeUsers = allUserIds.size;

  const lastSync = lastSyncs[0]?.syncedAt ?? null;

  // ── Daily usage transform ─────────────────────────────────────────────────
  // Build a map: date → { chatgpt, claude }
  const usageMap = new Map<string, { chatgpt: number; claude: number }>();
  for (const row of dailyUsageRaw) {
    const key = (row.date as Date).toISOString().slice(0, 10);
    if (!usageMap.has(key)) usageMap.set(key, { chatgpt: 0, claude: 0 });
    const entry = usageMap.get(key)!;
    const tokens = Number(row._sum.totalTokens ?? 0);
    if (row.platform === "chatgpt") entry.chatgpt += tokens;
    else if (row.platform === "claude") entry.claude += tokens;
  }
  const usageData = Array.from(usageMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, chatgpt: v.chatgpt, claude: v.claude, total: v.chatgpt + v.claude }));

  // ── Daily cost transform ──────────────────────────────────────────────────
  const costMap = new Map<string, { chatgpt: number; claude: number }>();
  for (const row of dailyCostsRaw) {
    const key = (row.date as Date).toISOString().slice(0, 10);
    if (!costMap.has(key)) costMap.set(key, { chatgpt: 0, claude: 0 });
    const entry = costMap.get(key)!;
    const amt = Number(row._sum.amount ?? 0);
    if (row.platform === "chatgpt") entry.chatgpt += amt;
    else if (row.platform === "claude") entry.claude += amt;
  }
  const costData = Array.from(costMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, chatgpt: v.chatgpt, claude: v.claude, total: v.chatgpt + v.claude }));

  // ── Model distribution ────────────────────────────────────────────────────
  const totalModelTokens = modelUsageRaw.reduce(
    (sum, r) => sum + Number(r._sum.totalTokens ?? 0),
    0
  );
  const modelData = modelUsageRaw.map((r) => {
    const tokens = Number(r._sum.totalTokens ?? 0);
    return {
      model: r.model,
      platform: r.platform,
      tokens,
      percentage: totalModelTokens > 0 ? Math.round((tokens / totalModelTokens) * 1000) / 10 : 0,
    };
  });

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: "#0a0a0f", minHeight: "100vh" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>
          AI Usage Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
          Last 30 days &middot; Updated {formatDate(lastSync)}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total Tokens"
          value={formatTokens(totalTokens)}
          accentColor="#6366f1"
        />
        <KpiCard
          label="Total Cost"
          value={formatCost(totalCost)}
          accentColor="#10a37f"
        />
        <KpiCard
          label="Active Users"
          value={String(activeUsers)}
          accentColor="#3b82f6"
        />
        <KpiCard
          label="ChatGPT Tokens"
          value={formatTokens(chatgptTokens)}
          sub={formatCost(chatgptCost)}
          accentColor="#10a37f"
        />
        <KpiCard
          label="Claude Tokens"
          value={formatTokens(claudeTokens)}
          sub={formatCost(claudeCost)}
          accentColor="#d97706"
        />
      </div>

      {/* Tabs */}
      <div
        className="rounded-xl border p-1"
        style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
      >
        <Tabs defaultValue="usage">
          <div className="px-4 pt-3 pb-1">
            <TabsList
              className="inline-flex gap-1 rounded-lg p-1"
              style={{ backgroundColor: "#0a0a0f" }}
            >
              <TabsTrigger
                value="usage"
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors data-[state=active]:bg-[#1a1a26] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
              >
                Usage
              </TabsTrigger>
              <TabsTrigger
                value="costs"
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors data-[state=active]:bg-[#1a1a26] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
              >
                Costs
              </TabsTrigger>
              <TabsTrigger
                value="models"
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors data-[state=active]:bg-[#1a1a26] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
              >
                Models
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="usage" className="p-4 pt-2">
            {usageData.length === 0 ? (
              <div className="h-64 flex items-center justify-center" style={{ color: "#94a3b8" }}>
                No usage data for the last 30 days.
              </div>
            ) : (
              <UsageChart data={usageData} />
            )}
          </TabsContent>

          <TabsContent value="costs" className="p-4 pt-2">
            {costData.length === 0 ? (
              <div className="h-64 flex items-center justify-center" style={{ color: "#94a3b8" }}>
                No cost data for the last 30 days.
              </div>
            ) : (
              <CostChart data={costData} />
            )}
          </TabsContent>

          <TabsContent value="models" className="p-4 pt-2">
            {modelData.length === 0 ? (
              <div className="h-64 flex items-center justify-center" style={{ color: "#94a3b8" }}>
                No model data for the last 30 days.
              </div>
            ) : (
              <ModelDistribution data={modelData} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
