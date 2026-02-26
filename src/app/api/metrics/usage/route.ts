import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type DayMap = Record<string, { chatgpt: bigint; claude: bigint }>;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") ?? "30";
    const platform = searchParams.get("platform") ?? "all";

    const periodDays = parseInt(periodParam, 10);
    const validPeriods = [7, 30, 90];
    const days = validPeriods.includes(periodDays) ? periodDays : 30;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const platformFilter =
      platform === "chatgpt" || platform === "claude"
        ? { platform }
        : undefined;

    const records = await db.usageRecord.findMany({
      where: {
        date: { gte: since },
        ...(platformFilter ?? {}),
      },
      select: {
        platform: true,
        date: true,
        totalTokens: true,
      },
      orderBy: { date: "asc" },
    });

    // Build a map keyed by YYYY-MM-DD
    const dayMap: DayMap = {};

    for (const rec of records) {
      const dateStr = rec.date.toISOString().slice(0, 10);
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = { chatgpt: BigInt(0), claude: BigInt(0) };
      }
      if (rec.platform === "chatgpt") {
        dayMap[dateStr].chatgpt += rec.totalTokens;
      } else if (rec.platform === "claude") {
        dayMap[dateStr].claude += rec.totalTokens;
      }
    }

    // Fill in all dates in range so chart has continuous x-axis
    const result: Array<{ date: string; chatgpt: number; claude: number; total: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const entry = dayMap[dateStr] ?? { chatgpt: BigInt(0), claude: BigInt(0) };
      const chatgptNum = Number(entry.chatgpt);
      const claudeNum = Number(entry.claude);
      result.push({
        date: dateStr,
        chatgpt: chatgptNum,
        claude: claudeNum,
        total: chatgptNum + claudeNum,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[metrics/usage] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
