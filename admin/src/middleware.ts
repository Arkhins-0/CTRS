import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast cookie-presence check only (no DB on the edge). The authoritative
 * permission checks live in requirePermission() inside every server action,
 * route handler and section layout.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/login")) return NextResponse.next();
  if (!req.cookies.has("ctr_admin_session")) {
    const login = new URL("/login", req.url);
    if (pathname !== "/") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  /*
   * The PWA shell must stay reachable without a session: a redirected sw.js
   * never registers, and the manifest and offline page are fetched in states
   * where no cookie is present (install, first load, offline navigation).
   * None of them expose data — the worker caches no authenticated response.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|offline\\.html|.*\\.(?:png|jpg|svg|ico|webp)).*)",
  ],
};
