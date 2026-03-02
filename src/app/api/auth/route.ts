import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword) {
    // No password configured — allow all access
    return NextResponse.json({ success: true });
  }

  if (password === appPassword) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 });
}
