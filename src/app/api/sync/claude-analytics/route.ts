import { NextResponse } from "next/server";
import { syncClaudeAnalytics } from "@/lib/analytics-sync";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  return token === process.env.CRON_SECRET;
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development" && !isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncClaudeAnalytics(1); // cron: pull yesterday only
    return NextResponse.json({
      success: true,
      summaryCount: result.summaryCount,
      userActivityCount: result.userActivityCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sync/claude-analytics] Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
