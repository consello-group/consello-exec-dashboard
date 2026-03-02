import { NextRequest, NextResponse } from "next/server";

// Auth is handled client-side via AuthProvider + DashboardGuard.
// This proxy is a pass-through — no server-side gating needed.
export function proxy(_request: NextRequest): NextResponse {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)"],
};
