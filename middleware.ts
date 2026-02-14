import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/monitor/:path*", "/reminders/:path*", "/leaderboard/:path*", "/share/:path*", "/profile/:path*"],
};

