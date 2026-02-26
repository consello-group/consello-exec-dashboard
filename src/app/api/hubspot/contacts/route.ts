import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const contacts = await db.hubSpotContact.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        company: true,
        jobTitle: true,
        lifecycleStage: true,
        ownerId: true,
        createdAt: true,
      },
    });

    const total = contacts.length;
    if (total === 0) {
      return NextResponse.json({
        totalContacts: 0,
        completeness: {
          withEmail: 0,
          withPhone: 0,
          withCompany: 0,
          withJobTitle: 0,
          withOwner: 0,
          emailPct: 0,
          phonePct: 0,
          companyPct: 0,
          jobTitlePct: 0,
          ownerPct: 0,
        },
        byLifecycleStage: {},
        byOwner: {},
        createdLast30Days: 0,
        unassigned: 0,
      });
    }

    // Completeness counts
    let withEmail = 0;
    let withPhone = 0;
    let withCompany = 0;
    let withJobTitle = 0;
    let withOwner = 0;
    let unassigned = 0;
    let createdLast30Days = 0;

    const byLifecycleStage: Record<string, number> = {};
    const byOwner: Record<string, number> = {};

    for (const c of contacts) {
      if (c.email) withEmail++;
      if (c.phone) withPhone++;
      if (c.company) withCompany++;
      if (c.jobTitle) withJobTitle++;
      if (c.ownerId) {
        withOwner++;
        byOwner[c.ownerId] = (byOwner[c.ownerId] ?? 0) + 1;
      } else {
        unassigned++;
      }

      if (c.lifecycleStage) {
        byLifecycleStage[c.lifecycleStage] =
          (byLifecycleStage[c.lifecycleStage] ?? 0) + 1;
      }

      if (c.createdAt >= thirtyDaysAgo) {
        createdLast30Days++;
      }
    }

    const pct = (n: number) => Math.round((n / total) * 1000) / 10; // one decimal

    return NextResponse.json({
      totalContacts: total,
      completeness: {
        withEmail,
        withPhone,
        withCompany,
        withJobTitle,
        withOwner,
        emailPct: pct(withEmail),
        phonePct: pct(withPhone),
        companyPct: pct(withCompany),
        jobTitlePct: pct(withJobTitle),
        ownerPct: pct(withOwner),
      },
      byLifecycleStage,
      byOwner,
      createdLast30Days,
      unassigned,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[hubspot/contacts] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
