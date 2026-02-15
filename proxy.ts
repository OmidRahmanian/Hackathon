import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const authCookie = request.cookies.get("postureos-auth")?.value;
  const isAuthenticated = authCookie === "1";

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/monitor/:path*",
    "/reminders/:path*",
    "/ai/:path*",
    "/leaderboard/:path*",
    "/share/:path*",
    "/profile/:path*",
  ],
};
