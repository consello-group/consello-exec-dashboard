import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Aggregate usage per user per platform
    const usageByUser = await db.usageRecord.groupBy({
      by: ["userId", "platform"],
      _sum: {
        totalTokens: true,
        requests: true,
      },
    });

    // Aggregate costs per user per platform
    const costsByUser = await db.costRecord.groupBy({
      by: ["userId", "platform"],
      _sum: { amount: true },
    });

    // Fetch all users
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true },
    });

    type UserStats = {
      userId: string;
      email: string;
      name: string | null;
      chatgptTokens: number;
      claudeTokens: number;
      totalTokens: number;
      chatgptCost: number;
      claudeCost: number;
      totalCost: number;
      chatgptRequests: number;
      claudeRequests: number;
    };

    const statsMap = new Map<string, UserStats>();

    // Initialize map from users that have any usage
    const relevantUserIds = new Set([
      ...usageByUser.map((u) => u.userId).filter(Boolean),
      ...costsByUser.map((c) => c.userId).filter(Boolean),
    ]) as Set<string>;

    for (const userId of relevantUserIds) {
      const user = users.find((u) => u.id === userId);
      if (!user) continue;
      statsMap.set(userId, {
        userId,
        email: user.email,
        name: user.name,
        chatgptTokens: 0,
        claudeTokens: 0,
        totalTokens: 0,
        chatgptCost: 0,
        claudeCost: 0,
        totalCost: 0,
        chatgptRequests: 0,
        claudeRequests: 0,
      });
    }

    // Fill usage
    for (const rec of usageByUser) {
      if (!rec.userId) continue;
      const stats = statsMap.get(rec.userId);
      if (!stats) continue;
      const tokens = Number(rec._sum.totalTokens ?? BigInt(0));
      const requests = rec._sum.requests ?? 0;
      if (rec.platform === "chatgpt") {
        stats.chatgptTokens += tokens;
        stats.chatgptRequests += requests;
      } else if (rec.platform === "claude") {
        stats.claudeTokens += tokens;
        stats.claudeRequests += requests;
      }
    }

    // Fill costs
    for (const rec of costsByUser) {
      if (!rec.userId) continue;
      const stats = statsMap.get(rec.userId);
      if (!stats) continue;
      const amount = Number(rec._sum.amount ?? 0);
      if (rec.platform === "chatgpt") {
        stats.chatgptCost += amount;
      } else if (rec.platform === "claude") {
        stats.claudeCost += amount;
      }
    }

    // Compute totals and sort
    const result: UserStats[] = Array.from(statsMap.values()).map((s) => ({
      ...s,
      totalTokens: s.chatgptTokens + s.claudeTokens,
      totalCost: Math.round((s.chatgptCost + s.claudeCost) * 10000) / 10000,
    }));

    result.sort((a, b) => b.totalTokens - a.totalTokens);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[metrics/users] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
