export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { PipelineFunnel } from "@/components/charts/pipeline-funnel";
import { DealsTable } from "@/components/tables/deals-table";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  if (n >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `$${(n / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PipelinePage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [deals, stages] = await Promise.all([
    db.hubSpotDeal.findMany({ orderBy: { amount: "desc" } }),
    db.hubSpotPipelineStage.findMany({ orderBy: { displayOrder: "asc" } }),
  ]);

  // ── Stage lookup map ──────────────────────────────────────────────────────
  // key: stageId → { probability, stageLabel, pipelineLabel }
  const stageMap = new Map(
    stages.map((s) => [
      s.stageId,
      { probability: s.probability, stageLabel: s.stageLabel, pipelineLabel: s.pipelineLabel },
    ])
  );

  // Closed-won / closed-lost stage keywords to filter open deals
  const CLOSED_KEYWORDS = ["closedwon", "closed won", "closedlost", "closed lost", "won", "lost"];
  const isClosedStage = (stageId: string, stageLabel: string | null): boolean => {
    const labelLower = (stageLabel ?? "").toLowerCase();
    const idLower = stageId.toLowerCase();
    return CLOSED_KEYWORDS.some((kw) => labelLower.includes(kw) || idLower.includes(kw));
  };

  const openDeals = deals.filter(
    (d) => !isClosedStage(d.stage, d.stageLabel)
  );

  // ── KPI calculations ──────────────────────────────────────────────────────
  const totalPipelineValue = openDeals.reduce(
    (sum, d) => sum + Number(d.amount ?? 0),
    0
  );

  const weightedForecast = openDeals.reduce((sum, d) => {
    const prob = stageMap.get(d.stage)?.probability ?? 0;
    return sum + Number(d.amount ?? 0) * prob;
  }, 0);

  const openDealsCount = openDeals.length;
  const avgDealSize = openDealsCount > 0 ? totalPipelineValue / openDealsCount : 0;

  const staleDeals = openDeals.filter((d) => {
    const daysSince =
      (Date.now() - new Date(d.lastModified).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 30;
  }).length;

  // ── Pipeline funnel data ──────────────────────────────────────────────────
  // Build pipeline → stages grouped structure
  const pipelineMap = new Map<
    string,
    {
      pipelineLabel: string;
      stagesMap: Map<string, { stageLabel: string; dealCount: number; totalAmount: number; probability: number; displayOrder: number }>;
    }
  >();

  for (const deal of openDeals) {
    const stageInfo = stageMap.get(deal.stage);
    const pipelineId = deal.pipeline;
    const pipelineLabel = deal.pipelineLabel ?? pipelineId;

    if (!pipelineMap.has(pipelineId)) {
      pipelineMap.set(pipelineId, { pipelineLabel, stagesMap: new Map() });
    }
    const pipeline = pipelineMap.get(pipelineId)!;

    const stageKey = deal.stage;
    const existing = pipeline.stagesMap.get(stageKey) ?? {
      stageLabel: deal.stageLabel ?? stageInfo?.stageLabel ?? deal.stage,
      dealCount: 0,
      totalAmount: 0,
      probability: stageInfo?.probability ?? 0,
      displayOrder: stages.find((s) => s.stageId === deal.stage)?.displayOrder ?? 99,
    };
    existing.dealCount += 1;
    existing.totalAmount += Number(deal.amount ?? 0);
    pipeline.stagesMap.set(stageKey, existing);
  }

  const funnelPipelines = Array.from(pipelineMap.entries()).map(([, v]) => ({
    pipelineLabel: v.pipelineLabel,
    stages: Array.from(v.stagesMap.values())
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((s) => ({
        stageLabel: s.stageLabel,
        dealCount: s.dealCount,
        totalAmount: s.totalAmount,
        probability: s.probability,
      })),
  }));

  // ── Serialize deals for client component ─────────────────────────────────
  const serializedDeals = openDeals.map((d) => {
    const daysSinceModified =
      (Date.now() - new Date(d.lastModified).getTime()) / (1000 * 60 * 60 * 24);
    return {
      id: d.id,
      name: d.name,
      stage: d.stage,
      stageLabel: d.stageLabel,
      pipeline: d.pipeline,
      pipelineLabel: d.pipelineLabel,
      amount: d.amount !== null ? Number(d.amount) : null,
      closeDate: d.closeDate ? d.closeDate.toISOString() : null,
      ownerId: d.ownerId,
      ownerName: d.ownerName,
      createdAt: d.createdAt.toISOString(),
      lastModified: d.lastModified.toISOString(),
      daysInStage: d.daysInStage,
      isStale: daysSinceModified > 30,
    };
  });

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: "#0a0a0f", minHeight: "100vh" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>
          Pipeline &amp; Revenue
        </h1>
        <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
          {deals.length} total deals &middot; {openDealsCount} open
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total Pipeline Value"
          value={formatCurrency(totalPipelineValue)}
          sub={`${openDealsCount} open deals`}
          accentColor="#ff7a59"
        />
        <KpiCard
          label="Weighted Forecast"
          value={formatCurrency(weightedForecast)}
          sub="Stage probability weighted"
          accentColor="#10a37f"
        />
        <KpiCard
          label="Open Deals"
          value={String(openDealsCount)}
          sub={`${deals.length} total`}
          accentColor="#3b82f6"
        />
        <KpiCard
          label="Avg Deal Size"
          value={formatCurrency(avgDealSize)}
          sub="Open deals only"
          accentColor="#6366f1"
        />
        <KpiCard
          label="Stale Deals"
          value={String(staleDeals)}
          sub="No activity 30+ days"
          accentColor={staleDeals > 0 ? "#ef4444" : "#10a37f"}
        />
      </div>

      {/* Pipeline Funnel */}
      {funnelPipelines.length > 0 ? (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
        >
          <h2 className="text-base font-semibold mb-4" style={{ color: "#f1f5f9" }}>
            Pipeline Funnel
          </h2>
          <PipelineFunnel pipelines={funnelPipelines} />
        </div>
      ) : (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a", color: "#94a3b8" }}
        >
          No pipeline stage data available.
        </div>
      )}

      {/* Deals Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: "#2a2a3a" }}>
          <h2 className="text-base font-semibold" style={{ color: "#f1f5f9" }}>
            Open Deals
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
            {openDealsCount} deals &middot; sorted by amount
          </p>
        </div>
        {serializedDeals.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "#94a3b8" }}>
            No open deals found. Sync HubSpot data to populate this view.
          </div>
        ) : (
          <DealsTable deals={serializedDeals} />
        )}
      </div>
    </div>
  );
}
