import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Returns the ISO Monday (week start) for a given Date
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const now = new Date();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(now.getDate() - 84);

    // Fetch all engagements from the last 12 weeks
    const engagements = await db.hubSpotEngagement.findMany({
      where: { occurredAt: { gte: twelveWeeksAgo } },
      select: { id: true, type: true, ownerId: true, occurredAt: true },
      orderBy: { occurredAt: "desc" },
    });

    // Fetch all owners
    const owners = await db.hubSpotOwner.findMany();
    const ownerMap = new Map(
      owners.map((o) => [
        o.id,
        {
          id: o.id,
          email: o.email,
          name: `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || o.email,
          teamName: o.teamName,
        },
      ])
    );

    // Activity type breakdown (all time in 12-week window)
    const typeBreakdown: Record<string, number> = {};
    for (const eng of engagements) {
      typeBreakdown[eng.type] = (typeBreakdown[eng.type] ?? 0) + 1;
    }

    // Weekly trend (total per week, last 12 weeks)
    const weeklyTrendMap = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i * 7);
      weeklyTrendMap.set(getWeekStart(d), 0);
    }
    for (const eng of engagements) {
      const weekStr = getWeekStart(eng.occurredAt);
      if (weeklyTrendMap.has(weekStr)) {
        weeklyTrendMap.set(weekStr, (weeklyTrendMap.get(weekStr) ?? 0) + 1);
      }
    }
    const weeklyTrend = Array.from(weeklyTrendMap.entries()).map(([week, count]) => ({
      week,
      count,
    }));

    // Per-owner activity counts per week (last 12 weeks)
    type OwnerWeekMap = Map<string, Map<string, number>>;
    const ownerWeekActivity: OwnerWeekMap = new Map();

    for (const eng of engagements) {
      if (!eng.ownerId) continue;
      if (!ownerWeekActivity.has(eng.ownerId)) {
        ownerWeekActivity.set(eng.ownerId, new Map());
      }
      const weekStr = getWeekStart(eng.occurredAt);
      const ownerMap2 = ownerWeekActivity.get(eng.ownerId)!;
      ownerMap2.set(weekStr, (ownerMap2.get(weekStr) ?? 0) + 1);
    }

    const ownerActivity = Array.from(ownerWeekActivity.entries()).map(
      ([ownerId, weekMap]) => {
        const owner = ownerMap.get(ownerId);
        const weeks = Array.from(weekMap.entries()).map(([week, count]) => ({
          week,
          count,
        }));
        return {
          ownerId,
          ownerName: owner?.name ?? ownerId,
          ownerEmail: owner?.email ?? null,
          teamName: owner?.teamName ?? null,
          totalActivities: weeks.reduce((s, w) => s + w.count, 0),
          weeks,
        };
      }
    );
    ownerActivity.sort((a, b) => b.totalActivities - a.totalActivities);

    // Find inactive owners (owners with 0 activity in recent windows)
    const activeOwnerIds7 = new Set(
      engagements
        .filter((e) => e.occurredAt >= sevenDaysAgo && e.ownerId)
        .map((e) => e.ownerId as string)
    );
    const activeOwnerIds14 = new Set(
      engagements
        .filter((e) => e.occurredAt >= fourteenDaysAgo && e.ownerId)
        .map((e) => e.ownerId as string)
    );
    const activeOwnerIds30 = new Set(
      engagements
        .filter((e) => e.occurredAt >= thirtyDaysAgo && e.ownerId)
        .map((e) => e.ownerId as string)
    );

    const inactiveUsers = owners
      .filter((o) => {
        const in7 = !activeOwnerIds7.has(o.id);
        const in14 = !activeOwnerIds14.has(o.id);
        const in30 = !activeOwnerIds30.has(o.id);
        return in7 || in14 || in30;
      })
      .map((o) => ({
        ownerId: o.id,
        ownerName: `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || o.email,
        ownerEmail: o.email,
        inactiveDays7: !activeOwnerIds7.has(o.id),
        inactiveDays14: !activeOwnerIds14.has(o.id),
        inactiveDays30: !activeOwnerIds30.has(o.id),
      }));

    return NextResponse.json({
      metrics: {
        totalActivitiesLast30Days: engagements.filter(
          (e) => e.occurredAt >= thirtyDaysAgo
        ).length,
        totalActivitiesLast7Days: engagements.filter(
          (e) => e.occurredAt >= sevenDaysAgo
        ).length,
        typeBreakdown,
        activeOwners: activeOwnerIds30.size,
        inactiveOwners: inactiveUsers.filter((u) => u.inactiveDays30).length,
      },
      ownerActivity,
      weeklyTrend,
      inactiveUsers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[hubspot/activity] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
