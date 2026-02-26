export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { RelationshipHeatmap } from "@/components/charts/relationship-heatmap";
import { ActivityTimeline } from "@/components/charts/activity-timeline";
import { ColdCompanies } from "@/components/tables/cold-companies";

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

// ─── Health bucket classifier ─────────────────────────────────────────────────

function getHealthBucket(
  daysSince: number | null
): "active" | "cooling" | "cold" | "at-risk" {
  if (daysSince === null) return "at-risk";
  if (daysSince <= 14) return "active";
  if (daysSince <= 30) return "cooling";
  if (daysSince <= 60) return "cold";
  return "at-risk";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RelationshipsPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [companies, engagements, owners] = await Promise.all([
    db.hubSpotCompany.findMany({ orderBy: { lastContacted: "asc" } }),
    db.hubSpotEngagement.findMany({
      where: { occurredAt: { gte: thirtyDaysAgo } },
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
    db.hubSpotOwner.findMany(),
  ]);

  // ── Owner lookup ──────────────────────────────────────────────────────────
  const ownerMap = new Map(
    owners.map((o) => [
      o.id,
      `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || o.email,
    ])
  );

  // ── Company health calculations ───────────────────────────────────────────
  const now = Date.now();
  const companiesWithHealth = companies.map((c) => {
    const daysSince =
      c.lastContacted
        ? Math.floor((now - new Date(c.lastContacted).getTime()) / (1000 * 60 * 60 * 24))
        : null;
    const healthBucket = getHealthBucket(daysSince);
    return { ...c, daysSince, healthBucket };
  });

  const healthBuckets = { active: 0, cooling: 0, cold: 0, atRisk: 0 };
  for (const c of companiesWithHealth) {
    if (c.healthBucket === "active") healthBuckets.active++;
    else if (c.healthBucket === "cooling") healthBuckets.cooling++;
    else if (c.healthBucket === "cold") healthBuckets.cold++;
    else if (c.healthBucket === "at-risk") healthBuckets.atRisk++;
  }

  // ── KPI metrics ───────────────────────────────────────────────────────────
  const activeCompanies =
    healthBuckets.active + healthBuckets.cooling;
  const atRiskCompanies = healthBuckets.atRisk;

  const companiesWithContact = companiesWithHealth.filter(
    (c) => c.daysSince !== null
  );
  const avgDaysBetweenContacts =
    companiesWithContact.length > 0
      ? Math.round(
          companiesWithContact.reduce((sum, c) => sum + (c.daysSince ?? 0), 0) /
            companiesWithContact.length
        )
      : 0;

  const engagementsThisWeek = engagements.filter(
    (e) => new Date(e.occurredAt) >= sevenDaysAgo
  ).length;

  // ── Serialize heatmap data ────────────────────────────────────────────────
  const heatmapData = companiesWithHealth.map((c) => ({
    id: c.id,
    name: c.name,
    domain: c.domain,
    ownerId: c.ownerId,
    ownerName: c.ownerName ?? (c.ownerId ? ownerMap.get(c.ownerId) ?? null : null),
    lastContacted: c.lastContacted ? c.lastContacted.toISOString() : null,
    lastActivity: c.lastActivity ? c.lastActivity.toISOString() : null,
    associatedContacts: c.associatedContacts,
    associatedDeals: c.associatedDeals,
    createdAt: c.createdAt.toISOString(),
    daysSinceContact: c.daysSince,
    healthBucket: c.healthBucket as "active" | "cooling" | "cold" | "at-risk",
  }));

  // Build company name lookup
  const companyNameMap = new Map(companies.map((c) => [c.id, c.name]));

  // ── Recent activity feed (top 20) ────────────────────────────────────────
  const recentActivities = engagements.slice(0, 20).map((e) => ({
    id: e.id,
    type: e.type,
    ownerName: e.ownerId ? ownerMap.get(e.ownerId) ?? null : null,
    companyName: e.companyId ? companyNameMap.get(e.companyId) ?? null : null,
    occurredAt: e.occurredAt.toISOString(),
  }));

  // ── Cold companies (60+ days silent) ─────────────────────────────────────
  const coldCompaniesData = companiesWithHealth
    .filter((c) => c.daysSince !== null && c.daysSince >= 60)
    .sort((a, b) => (b.daysSince ?? 0) - (a.daysSince ?? 0))
    .map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      ownerId: c.ownerId,
      ownerName: c.ownerName ?? (c.ownerId ? ownerMap.get(c.ownerId) ?? null : null),
      lastContacted: c.lastContacted ? c.lastContacted.toISOString() : null,
      lastActivity: c.lastActivity ? c.lastActivity.toISOString() : null,
      associatedContacts: c.associatedContacts,
      associatedDeals: c.associatedDeals,
      createdAt: c.createdAt.toISOString(),
      daysSinceContact: c.daysSince,
      healthBucket: c.healthBucket as "active" | "cooling" | "cold" | "at-risk",
    }));

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: "#0a0a0f", minHeight: "100vh" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>
          Client Relationship Health
        </h1>
        <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
          {companies.length} companies tracked &middot; Last 30 days of engagement
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Active Companies"
          value={String(activeCompanies)}
          sub="Contacted within 30 days"
          accentColor="#10a37f"
        />
        <KpiCard
          label="At-Risk Companies"
          value={String(atRiskCompanies)}
          sub="Silent 60+ days"
          accentColor={atRiskCompanies > 0 ? "#ef4444" : "#10a37f"}
        />
        <KpiCard
          label="Avg Days Since Contact"
          value={`${avgDaysBetweenContacts}d`}
          sub={`${companiesWithContact.length} companies with data`}
          accentColor="#3b82f6"
        />
        <KpiCard
          label="Engagements This Week"
          value={String(engagementsThisWeek)}
          sub={`${engagements.length} this month`}
          accentColor="#6366f1"
        />
      </div>

      {/* Health bucket summary */}
      <div className="grid grid-cols-4 gap-3">
        {(
          [
            { key: "active", label: "Active", count: healthBuckets.active, color: "#10a37f", sub: "≤ 14 days" },
            { key: "cooling", label: "Cooling", count: healthBuckets.cooling, color: "#3b82f6", sub: "15–30 days" },
            { key: "cold", label: "Cold", count: healthBuckets.cold, color: "#d97706", sub: "31–60 days" },
            { key: "at-risk", label: "At Risk", count: healthBuckets.atRisk, color: "#ef4444", sub: "60+ days" },
          ] as const
        ).map((bucket) => (
          <div
            key={bucket.key}
            className="rounded-lg border p-4 text-center"
            style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
          >
            <p className="text-2xl font-bold" style={{ color: bucket.color }}>
              {bucket.count}
            </p>
            <p className="text-sm font-medium mt-1" style={{ color: "#f1f5f9" }}>
              {bucket.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
              {bucket.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Main content — heatmap + timeline */}
      {heatmapData.length === 0 ? (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a", color: "#94a3b8" }}
        >
          No company data found. Sync HubSpot to populate this view.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Relationship Heatmap (2/3 width) */}
          <div
            className="col-span-2 rounded-xl border p-5"
            style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
          >
            <h2 className="text-base font-semibold mb-4" style={{ color: "#f1f5f9" }}>
              Relationship Health Map
            </h2>
            <RelationshipHeatmap companies={heatmapData} />
          </div>

          {/* Activity Timeline (1/3 width) */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
          >
            <h2 className="text-base font-semibold mb-4" style={{ color: "#f1f5f9" }}>
              Recent Activity
            </h2>
            {recentActivities.length === 0 ? (
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                No activity in the last 30 days.
              </p>
            ) : (
              <ActivityTimeline activities={recentActivities} />
            )}
          </div>
        </div>
      )}

      {/* Cold Companies Table */}
      {coldCompaniesData.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "#2a2a3a" }}>
            <h2 className="text-base font-semibold" style={{ color: "#f1f5f9" }}>
              Dormant Companies
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
              {coldCompaniesData.length} companies with no contact in 60+ days
            </p>
          </div>
          <ColdCompanies companies={coldCompaniesData} />
        </div>
      )}
    </div>
  );
}
