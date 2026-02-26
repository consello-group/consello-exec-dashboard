import { NextResponse } from "next/server";
import { syncClaude } from "@/lib/sync";

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
    const result = await syncClaude();
    return NextResponse.json({
      success: true,
      recordCount: result.recordCount,
      userCount: result.userCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sync/claude] Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncClaude();
    return NextResponse.json({
      success: true,
      recordCount: result.recordCount,
      userCount: result.userCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sync/claude] Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
