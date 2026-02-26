import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/_next/", "/api/health", "/favicon.ico"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const password = process.env.DASHBOARD_PASSWORD;

  // If no password is configured, allow all access
  if (!password) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      // Accept either "password" or "user:password" format
      const [, pwd] = decoded.includes(":") ? decoded.split(":") : ["", decoded];
      const submittedPassword = decoded.includes(":") ? pwd : decoded;
      if (submittedPassword === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Consello Dashboard"',
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files that Next.js serves
     * internally (e.g. _next/static, _next/image).
     */
    "/((?!_next/static|_next/image|.*\.png$|.*\.jpg$|.*\.svg$).*)",
  ],
};
