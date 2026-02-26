import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateProductivityMetrics, calculateUserProductivityList, buildAdoptionTiers } from "@/lib/productivity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all users with their 30-day usage totals per platform
    const usageByUser = await db.usageRecord.groupBy({
      by: ["userId", "platform"],
      where: { date: { gte: thirtyDaysAgo }, userId: { not: null } },
      _sum: { totalTokens: true, requests: true },
    });

    // Fetch all users to join names/emails and costTier
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, department: true, costTier: true },
    });

    type UserInput = {
      userId: string;
      email: string;
      name: string | null;
      department: string | null;
      costTier: string | null;
      chatgptTokens: number;
      claudeTokens: number;
      totalTokens: number;
      chatgptRequests: number;
      claudeRequests: number;
      totalRequests: number;
    };

    const userMap = new Map<string, UserInput>();

    for (const rec of usageByUser) {
      if (!rec.userId) continue;
      const user = users.find((u) => u.id === rec.userId);
      if (!user) continue;

      if (!userMap.has(rec.userId)) {
        userMap.set(rec.userId, {
          userId: rec.userId,
          email: user.email,
          name: user.name,
          department: user.department,
          costTier: user.costTier,
          chatgptTokens: 0,
          claudeTokens: 0,
          totalTokens: 0,
          chatgptRequests: 0,
          claudeRequests: 0,
          totalRequests: 0,
        });
      }

      const entry = userMap.get(rec.userId)!;
      const tokens = Number(rec._sum.totalTokens ?? BigInt(0));
      const requests = rec._sum.requests ?? 0;

      if (rec.platform === "chatgpt") {
        entry.chatgptTokens += tokens;
        entry.chatgptRequests += requests;
      } else if (rec.platform === "claude") {
        entry.claudeTokens += tokens;
        entry.claudeRequests += requests;
      }
    }

    // Compute totals for each user
    const userInputs = Array.from(userMap.values()).map((u) => ({
      userId: u.userId,
      email: u.email,
      name: u.name,
      totalTokens: u.chatgptTokens + u.claudeTokens,
      requests: u.chatgptRequests + u.claudeRequests,
    }));

    // Fetch weekly usage for trend (last 12 weeks)
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const weeklyRecords = await db.usageRecord.findMany({
      where: { date: { gte: twelveWeeksAgo } },
      select: { date: true, requests: true },
      orderBy: { date: "asc" },
    });

    // Build weekly buckets (ISO week start = Monday)
    const weeklyMap = new Map<string, { conversations: number }>();
    for (const rec of weeklyRecords) {
      const d = new Date(rec.date);
      const day = d.getUTCDay(); // 0=Sun
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() + diff);
      const weekStr = monday.toISOString().slice(0, 10);
      if (!weeklyMap.has(weekStr)) {
        weeklyMap.set(weekStr, { conversations: 0 });
      }
      weeklyMap.get(weekStr)!.conversations += rec.requests;
    }

    const [metrics, userList] = await Promise.all([
      calculateProductivityMetrics(userInputs),
      calculateUserProductivityList(userInputs),
    ]);
    const adoptionTiers = buildAdoptionTiers(userList);

    return NextResponse.json({
      summary: metrics,
      users: userList,
      adoptionTiers,
      weeklyTrend: Array.from(weeklyMap.entries()).map(([week, v]) => ({ week, conversations: v.conversations })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[metrics/productivity] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
