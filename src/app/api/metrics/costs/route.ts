import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type DayCostMap = Record<string, { chatgpt: number; claude: number }>;

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

    const records = await db.costRecord.findMany({
      where: {
        date: { gte: since },
        ...(platformFilter ?? {}),
      },
      select: {
        platform: true,
        date: true,
        amount: true,
      },
      orderBy: { date: "asc" },
    });

    const dayMap: DayCostMap = {};

    for (const rec of records) {
      const dateStr = rec.date.toISOString().slice(0, 10);
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = { chatgpt: 0, claude: 0 };
      }
      const amount = Number(rec.amount);
      if (rec.platform === "chatgpt") {
        dayMap[dateStr].chatgpt += amount;
      } else if (rec.platform === "claude") {
        dayMap[dateStr].claude += amount;
      }
    }

    const result: Array<{ date: string; chatgpt: number; claude: number; total: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const entry = dayMap[dateStr] ?? { chatgpt: 0, claude: 0 };
      result.push({
        date: dateStr,
        chatgpt: Math.round(entry.chatgpt * 10000) / 10000,
        claude: Math.round(entry.claude * 10000) / 10000,
        total: Math.round((entry.chatgpt + entry.claude) * 10000) / 10000,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[metrics/costs] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
