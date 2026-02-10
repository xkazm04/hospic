import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isDevMode, getExpectedToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  if (isDevMode()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expectedToken = await getExpectedToken();

  if (token !== expectedToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login (auth page itself)
     * - /_next (Next.js internals)
     * - /favicon.ico, /icon.*, /apple-icon.* (icons)
     * - /*.svg, /*.png, /*.jpg, /*.jpeg, /*.gif, /*.webp (static images)
     */
    "/((?!login|_next|favicon\\.ico|icon\\.|apple-icon\\.|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$).*)",
  ],
};
