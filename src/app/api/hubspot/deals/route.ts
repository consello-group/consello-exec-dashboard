import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

// Stages considered closed
const CLOSED_STAGES = ["closedwon", "closedlost", "closed_won", "closed_lost"];

const isClosedStage = (stageId: string) =>
  CLOSED_STAGES.some((s) => stageId.toLowerCase().includes(s));

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const pipeline = searchParams.get("pipeline");
    const stage = searchParams.get("stage");
    const ownerId = searchParams.get("ownerId");
    const staleOnly = searchParams.get("stale") === "true";

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where: Prisma.HubSpotDealWhereInput = {};

    if (pipeline) where.pipeline = pipeline;
    if (stage) where.stage = stage;
    if (ownerId) where.ownerId = ownerId;

    if (staleOnly) {
      // Stale = last modified more than 30 days ago, not in a closed stage
      where.lastModified = { lt: thirtyDaysAgo };
    }

    const deals = await db.hubSpotDeal.findMany({
      where,
      orderBy: { amount: "desc" },
      take: 100,
    });

    const result = deals
      .filter((d) => {
        // When fetching stale deals, exclude closed stages
        if (staleOnly && isClosedStage(d.stage)) return false;
        return true;
      })
      .map((d) => {
        const isClosed = isClosedStage(d.stage);
        const isStale =
          !isClosed && d.lastModified < thirtyDaysAgo;

        return {
          id: d.id,
          name: d.name,
          stage: d.stage,
          stageLabel: d.stageLabel,
          pipeline: d.pipeline,
          pipelineLabel: d.pipelineLabel,
          amount: Number(d.amount ?? 0),
          closeDate: d.closeDate?.toISOString() ?? null,
          ownerId: d.ownerId,
          ownerName: d.ownerName,
          createdAt: d.createdAt.toISOString(),
          lastModified: d.lastModified.toISOString(),
          daysInStage: d.daysInStage,
          isClosed,
          isStale,
        };
      });

    return NextResponse.json({
      deals: result,
      total: result.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[hubspot/deals] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
