import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Token and request totals grouped by platform (last 30 days)
    const usageByPlatform = await db.usageRecord.groupBy({
      by: ["platform"],
      where: { date: { gte: thirtyDaysAgo } },
      _sum: {
        totalTokens: true,
        inputTokens: true,
        outputTokens: true,
        requests: true,
      },
    });

    // Cost totals grouped by platform (last 30 days)
    const costByPlatform = await db.costRecord.groupBy({
      by: ["platform"],
      where: { date: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    });

    // Active users per platform (distinct userId with usage in last 30 days)
    const [chatgptUserCount, claudeUserCount] = await Promise.all([
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

    // Last successful sync per platform
    const [chatgptSync, claudeSync] = await Promise.all([
      db.syncLog.findFirst({
        where: { platform: "chatgpt", status: "success" },
        orderBy: { syncedAt: "desc" },
      }),
      db.syncLog.findFirst({
        where: { platform: "claude", status: "success" },
        orderBy: { syncedAt: "desc" },
      }),
    ]);

    const getUsage = (platform: string) =>
      usageByPlatform.find((u) => u.platform === platform);
    const getCost = (platform: string) =>
      costByPlatform.find((c) => c.platform === platform);

    const chatgptUsage = getUsage("chatgpt");
    const claudeUsage = getUsage("claude");

    const chatgptTokens = chatgptUsage?._sum.totalTokens ?? BigInt(0);
    const claudeTokens = claudeUsage?._sum.totalTokens ?? BigInt(0);
    const totalTokens = chatgptTokens + claudeTokens;

    const chatgptRequests = chatgptUsage?._sum.requests ?? 0;
    const claudeRequests = claudeUsage?._sum.requests ?? 0;
    const totalRequests = chatgptRequests + claudeRequests;

    const chatgptCost = Number(getCost("chatgpt")?._sum.amount ?? 0);
    const claudeCost = Number(getCost("claude")?._sum.amount ?? 0);
    const totalCost = chatgptCost + claudeCost;

    const chatgptUsers = chatgptUserCount.length;
    const claudeUsers = claudeUserCount.length;

    // Deduplicate active users across platforms
    const allUserIds = new Set([
      ...chatgptUserCount.map((u) => u.userId),
      ...claudeUserCount.map((u) => u.userId),
    ]);
    const activeUsers = allUserIds.size;

    return NextResponse.json({
      totalTokens: totalTokens.toString(),
      totalRequests,
      totalCost,
      activeUsers,
      chatgptTokens: chatgptTokens.toString(),
      claudeTokens: claudeTokens.toString(),
      chatgptCost,
      claudeCost,
      chatgptUsers,
      claudeUsers,
      lastSynced: {
        chatgpt: chatgptSync?.syncedAt?.toISOString() ?? null,
        claude: claudeSync?.syncedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[metrics/overview] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
