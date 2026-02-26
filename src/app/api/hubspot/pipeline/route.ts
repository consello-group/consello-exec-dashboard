import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Stages that are considered closed (won or lost) — adjust if needed
const CLOSED_STAGES = ["closedwon", "closedlost", "closed_won", "closed_lost"];

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all deals with pipeline stage probability
    const deals = await db.hubSpotDeal.findMany({
      orderBy: { amount: "desc" },
    });

    // Fetch pipeline stage metadata for probability lookup
    const stages = await db.hubSpotPipelineStage.findMany();

    const stageProbabilityMap = new Map<string, number>();
    const stageLabelMap = new Map<string, string>();
    for (const s of stages) {
      stageProbabilityMap.set(`${s.pipelineId}::${s.stageId}`, s.probability);
      stageLabelMap.set(s.stageId, s.stageLabel);
    }

    // Determine closed status per deal
    const isClosedStage = (stageId: string) =>
      CLOSED_STAGES.some((s) => stageId.toLowerCase().includes(s));

    // Build pipeline aggregation
    type PipelineSummary = {
      pipelineId: string;
      pipelineLabel: string;
      stages: Array<{
        stageId: string;
        stageLabel: string;
        count: number;
        totalValue: number;
        weightedValue: number;
        probability: number;
        displayOrder: number;
      }>;
      totalValue: number;
      weightedForecast: number;
      openDeals: number;
    };

    const pipelineMap = new Map<string, PipelineSummary>();

    let totalPipelineValue = 0;
    let weightedForecast = 0;
    let openDeals = 0;
    let staleDeals = 0;
    const amounts: number[] = [];

    for (const deal of deals) {
      const isClosed = isClosedStage(deal.stage);
      const amount = Number(deal.amount ?? 0);
      const probability =
        stageProbabilityMap.get(`${deal.pipeline}::${deal.stage}`) ?? 0;

      if (!isClosed) {
        totalPipelineValue += amount;
        weightedForecast += amount * probability;
        openDeals++;
        if (amount > 0) amounts.push(amount);

        // Stale: last modified more than 30 days ago and not closed
        if (deal.lastModified < thirtyDaysAgo) {
          staleDeals++;
        }
      }

      // Per-pipeline aggregation
      if (!pipelineMap.has(deal.pipeline)) {
        pipelineMap.set(deal.pipeline, {
          pipelineId: deal.pipeline,
          pipelineLabel: deal.pipelineLabel ?? deal.pipeline,
          stages: [],
          totalValue: 0,
          weightedForecast: 0,
          openDeals: 0,
        });
      }

      const pipeline = pipelineMap.get(deal.pipeline)!;
      let stageEntry = pipeline.stages.find((s) => s.stageId === deal.stage);
      if (!stageEntry) {
        const stageOrder =
          stages.find(
            (s) => s.pipelineId === deal.pipeline && s.stageId === deal.stage
          )?.displayOrder ?? 0;
        stageEntry = {
          stageId: deal.stage,
          stageLabel: deal.stageLabel ?? stageLabelMap.get(deal.stage) ?? deal.stage,
          count: 0,
          totalValue: 0,
          weightedValue: 0,
          probability,
          displayOrder: stageOrder,
        };
        pipeline.stages.push(stageEntry);
      }
      stageEntry.count++;
      stageEntry.totalValue += amount;
      stageEntry.weightedValue += amount * probability;

      if (!isClosed) {
        pipeline.totalValue += amount;
        pipeline.weightedForecast += amount * probability;
        pipeline.openDeals++;
      }
    }

    // Sort stages by displayOrder within each pipeline
    for (const pipeline of pipelineMap.values()) {
      pipeline.stages.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    const avgDealSize =
      amounts.length > 0
        ? amounts.reduce((a, b) => a + b, 0) / amounts.length
        : 0;

    // Recent deals table: top 50 open deals by amount
    const recentDeals = deals
      .filter((d) => !isClosedStage(d.stage))
      .slice(0, 50)
      .map((d) => ({
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
        lastModified: d.lastModified.toISOString(),
        daysInStage: d.daysInStage,
        isStale: d.lastModified < thirtyDaysAgo,
      }));

    return NextResponse.json({
      pipelines: Array.from(pipelineMap.values()),
      totalPipelineValue: Math.round(totalPipelineValue * 100) / 100,
      weightedForecast: Math.round(weightedForecast * 100) / 100,
      openDeals,
      avgDealSize: Math.round(avgDealSize * 100) / 100,
      staleDeals,
      recentDeals,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[hubspot/pipeline] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
