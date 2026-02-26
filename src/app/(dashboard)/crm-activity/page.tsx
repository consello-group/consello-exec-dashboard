export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ActivityByOwnerChart } from "@/components/charts/activity-timeline";
import { ActivityTrendsChart } from "@/components/charts/activity-timeline";

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

export default async function CRMActivityPage() {
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [engagements, owners] = await Promise.all([
    db.hubSpotEngagement.findMany({
      where: { occurredAt: { gte: twelveWeeksAgo } },
      orderBy: { occurredAt: "desc" },
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

  // ── Weekly buckets (12 weeks) ─────────────────────────────────────────────
  // Build an array of 12 week-start dates (Monday-based)
  const weekStarts: Date[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    // Normalize to start of day
    d.setHours(0, 0, 0, 0);
    weekStarts.push(d);
  }

  const getWeekIndex = (date: Date): number => {
    for (let i = weekStarts.length - 1; i >= 0; i--) {
      if (date >= weekStarts[i]) return i;
    }
    return -1;
  };

  const weeklyTotals = new Array(12).fill(0);
  for (const e of engagements) {
    const idx = getWeekIndex(new Date(e.occurredAt));
    if (idx >= 0) weeklyTotals[idx]++;
  }

  const weeklyData = weekStarts.map((d, i) => ({
    week: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    count: weeklyTotals[i],
  }));

  // ── Per-owner activity totals (last 12 weeks) ─────────────────────────────
  const ownerActivityMap = new Map<string, number>();
  for (const e of engagements) {
    const ownerId = e.ownerId ?? "unknown";
    ownerActivityMap.set(ownerId, (ownerActivityMap.get(ownerId) ?? 0) + 1);
  }
  const ownerActivityData = Array.from(ownerActivityMap.entries())
    .map(([ownerId, count]) => ({
      ownerId,
      ownerName: ownerMap.get(ownerId) ?? ownerId,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // ── This week metrics ─────────────────────────────────────────────────────
  const thisWeekEngagements = engagements.filter(
    (e) => new Date(e.occurredAt) >= sevenDaysAgo
  );
  const totalThisWeek = thisWeekEngagements.length;

  const activeOwnerIds = new Set(
    engagements.filter((e) => e.ownerId).map((e) => e.ownerId!)
  );
  const activeCRMUsers = activeOwnerIds.size;
  const inactiveUsers = owners.length - activeCRMUsers;

  const mostActiveOwnerId = ownerActivityData[0]?.ownerId;
  const mostActiveUser = mostActiveOwnerId
    ? ownerMap.get(mostActiveOwnerId) ?? mostActiveOwnerId
    : null;

  // ── Inactive owners (no activity in last 7/14/30 days) ───────────────────
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ownerLastActivity = new Map<string, Date>();
  for (const e of engagements) {
    if (!e.ownerId) continue;
    const d = new Date(e.occurredAt);
    const existing = ownerLastActivity.get(e.ownerId);
    if (!existing || d > existing) ownerLastActivity.set(e.ownerId, d);
  }

  const inactiveOwnerRows = owners
    .map((o) => {
      const last = ownerLastActivity.get(o.id);
      const daysSince = last
        ? Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: o.id,
        name: `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || o.email,
        email: o.email,
        lastActivity: last ? last.toISOString() : null,
        daysSince,
        inactive7: !last || last < sevenDaysAgo,
        inactive14: !last || last < fourteenDaysAgo,
        inactive30: !last || last < thirtyDaysAgo,
      };
    })
    .filter((o) => o.inactive7)
    .sort((a, b) => (b.daysSince ?? 999) - (a.daysSince ?? 999));

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: "#0a0a0f", minHeight: "100vh" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>
          CRM Activity &amp; Adoption
        </h1>
        <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
          Last 12 weeks &middot; {engagements.length.toLocaleString()} total engagements tracked
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total This Week"
          value={String(totalThisWeek)}
          sub={`${engagements.length} over 12 weeks`}
          accentColor="#ff7a59"
        />
        <KpiCard
          label="Active CRM Users"
          value={String(activeCRMUsers)}
          sub={`of ${owners.length} total owners`}
          accentColor="#10a37f"
        />
        <KpiCard
          label="Inactive Users"
          value={String(inactiveUsers)}
          sub="No logged activity"
          accentColor={inactiveUsers > 0 ? "#ef4444" : "#10a37f"}
        />
        <KpiCard
          label="Most Active User"
          value={mostActiveUser ?? "None"}
          sub={
            mostActiveOwnerId
              ? `${ownerActivityData[0]?.count ?? 0} activities`
              : undefined
          }
          accentColor="#6366f1"
        />
      </div>

      {/* Tabs */}
      <div
        className="rounded-xl border p-1"
        style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
      >
        <Tabs defaultValue="byuser">
          <div className="px-4 pt-3 pb-1">
            <TabsList
              className="inline-flex gap-1 rounded-lg p-1"
              style={{ backgroundColor: "#0a0a0f" }}
            >
              <TabsTrigger
                value="byuser"
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors data-[state=active]:bg-[#1a1a26] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
              >
                Activity by User
              </TabsTrigger>
              <TabsTrigger
                value="trends"
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors data-[state=active]:bg-[#1a1a26] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
              >
                Trends
              </TabsTrigger>
              <TabsTrigger
                value="inactive"
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-colors data-[state=active]:bg-[#1a1a26] data-[state=active]:text-[#f1f5f9] text-[#94a3b8]"
              >
                Inactive Users
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Activity by User */}
          <TabsContent value="byuser" className="p-4 pt-2">
            {ownerActivityData.length === 0 ? (
              <div className="py-8 text-center" style={{ color: "#94a3b8" }}>
                No activity data found.
              </div>
            ) : (
              <ActivityByOwnerChart data={ownerActivityData} />
            )}
          </TabsContent>

          {/* Trends */}
          <TabsContent value="trends" className="p-4 pt-2">
            <ActivityTrendsChart data={weeklyData} />
          </TabsContent>

          {/* Inactive Users */}
          <TabsContent value="inactive" className="p-4 pt-2">
            {inactiveOwnerRows.length === 0 ? (
              <div className="py-8 text-center" style={{ color: "#94a3b8" }}>
                All owners have logged activity in the last 7 days.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2a2a3a" }}>
                      {["Owner", "Last Activity", "Days Silent", "7-Day", "14-Day", "30-Day"].map(
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
                    {inactiveOwnerRows.map((o, i) => (
                      <tr
                        key={o.id}
                        style={{
                          backgroundColor: i % 2 === 0 ? "transparent" : "#0f0f18",
                          borderBottom: "1px solid #1e1e2e",
                        }}
                        className="hover:bg-[#1a1a26] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium" style={{ color: "#f1f5f9" }}>
                              {o.name}
                            </p>
                            <p className="text-xs" style={{ color: "#94a3b8" }}>
                              {o.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>
                          {o.lastActivity
                            ? new Date(o.lastActivity).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Never"}
                        </td>
                        <td
                          className="px-4 py-3 font-mono font-semibold"
                          style={{ color: o.daysSince !== null && o.daysSince > 30 ? "#ef4444" : "#d97706" }}
                        >
                          {o.daysSince !== null ? `${o.daysSince}d` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <InactiveIndicator value={o.inactive7} />
                        </td>
                        <td className="px-4 py-3">
                          <InactiveIndicator value={o.inactive14} />
                        </td>
                        <td className="px-4 py-3">
                          <InactiveIndicator value={o.inactive30} />
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

// ─── Inactive indicator ───────────────────────────────────────────────────────

function InactiveIndicator({ value }: { value: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: value ? "#450a0a" : "#052e16",
        color: value ? "#ef4444" : "#10a37f",
      }}
    >
      {value ? "Inactive" : "Active"}
    </span>
  );
}
