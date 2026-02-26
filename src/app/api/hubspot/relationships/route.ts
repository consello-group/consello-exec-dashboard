import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);

    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);

    // Fetch all companies
    const companies = await db.hubSpotCompany.findMany({
      orderBy: { lastContacted: "desc" },
    });

    // Count all engagements per company in last 30 days
    const recentEngagements = await db.hubSpotEngagement.findMany({
      where: { occurredAt: { gte: thirtyDaysAgo } },
      select: { companyId: true, ownerId: true, type: true, occurredAt: true },
    });

    const engagementCountByCompany = new Map<string, number>();
    for (const eng of recentEngagements) {
      if (!eng.companyId) continue;
      engagementCountByCompany.set(
        eng.companyId,
        (engagementCountByCompany.get(eng.companyId) ?? 0) + 1
      );
    }

    // Bucket companies by days since last contact
    let active = 0;   // < 30 days
    let cooling = 0;  // 30-60 days
    let cold = 0;     // 60-90 days
    let atRisk = 0;   // 90+ days

    const companiesWithStats = companies.map((c) => {
      const lastContact = c.lastContacted ?? c.lastActivity;
      let daysSinceContact: number | null = null;
      let bucket: "active" | "cooling" | "cold" | "at-risk" | "unknown" = "unknown";

      if (lastContact) {
        daysSinceContact = Math.floor(
          (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceContact < 30) {
          active++;
          bucket = "active";
        } else if (daysSinceContact < 60) {
          cooling++;
          bucket = "cooling";
        } else if (daysSinceContact < 90) {
          cold++;
          bucket = "cold";
        } else {
          atRisk++;
          bucket = "at-risk";
        }
      }

      return {
        id: c.id,
        name: c.name,
        domain: c.domain,
        ownerId: c.ownerId,
        ownerName: c.ownerName,
        lastContacted: lastContact?.toISOString() ?? null,
        daysSinceContact,
        bucket,
        associatedContacts: c.associatedContacts,
        associatedDeals: c.associatedDeals,
        engagementsLast30Days: engagementCountByCompany.get(c.id) ?? 0,
      };
    });

    // Top 10 most engaged companies (last 30 days)
    const topEngaged = [...companiesWithStats]
      .sort((a, b) => b.engagementsLast30Days - a.engagementsLast30Days)
      .slice(0, 10);

    // Engagements in the last 7 days
    const thisWeekEngagements = await db.hubSpotEngagement.count({
      where: { occurredAt: { gte: sevenDaysAgo } },
    });

    // Recent activity feed: last 20 engagements with owner + company enrichment
    const recentActivityRaw = await db.hubSpotEngagement.findMany({
      orderBy: { occurredAt: "desc" },
      take: 20,
    });

    // Fetch owners for enrichment
    const ownerIds = [...new Set(recentActivityRaw.map((e) => e.ownerId).filter(Boolean))] as string[];
    const owners = ownerIds.length
      ? await db.hubSpotOwner.findMany({ where: { id: { in: ownerIds } } })
      : [];
    const ownerMap = new Map(owners.map((o) => [o.id, `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim()]));

    const companyNameMap = new Map(companies.map((c) => [c.id, c.name]));

    const recentActivity = recentActivityRaw.map((e) => ({
      id: e.id,
      type: e.type,
      ownerId: e.ownerId,
      ownerName: e.ownerId ? (ownerMap.get(e.ownerId) ?? e.ownerId) : null,
      companyId: e.companyId,
      companyName: e.companyId ? (companyNameMap.get(e.companyId) ?? null) : null,
      contactId: e.contactId,
      dealId: e.dealId,
      occurredAt: e.occurredAt.toISOString(),
    }));

    return NextResponse.json({
      metrics: {
        totalCompanies: companies.length,
        active,
        cooling,
        cold,
        atRisk,
        thisWeekEngagements,
      },
      companies: companiesWithStats,
      topEngaged,
      recentActivity,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[hubspot/relationships] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
