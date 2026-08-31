import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast cookie-presence check only (no DB on the edge). The authoritative
 * permission checks live in requirePermission()/requireMember() inside every
 * server action, route handler and section layout.
 *
 * Two principals share this app: CMS staff (ctr_admin_session) everywhere, and
 * organisation members (ctr_member_session) under /m. They are separate
 * cookies against separate tables — holding one never satisfies the other.
 */

/** Reachable with no session at all. */
const PUBLIC_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/confirm-email",
  "/m/login",
  "/m/join",
  "/m/forgot-password",
  "/m/reset-password",
];

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => isUnder(pathname, p))) return NextResponse.next();

  /*
   * Every /api/* route handler already does its own auth check
   * (getAdminSession/getMemberSession/checkPermission — verified across all
   * of them) and returns a proper 401/403 JSON or text response. Gating them
   * here too was actively wrong, not just redundant: a fetch() or a plain
   * <a href> hitting a member-only endpoint like /api/export/roster or
   * /api/member-push falls outside the /m prefix, so it fell through to the
   * ADMIN cookie check below and got redirected to the ADMIN /login page —
   * an HTML page where the caller expected CSV or JSON. That is exactly the
   * "asking to log in with an admin account" bug on the roster download.
   * Skipping API routes here entirely removes this whole bug class rather
   * than patching one path at a time.
   */
  if (isUnder(pathname, "/api")) return NextResponse.next();

  // Member area — gated by the member cookie, never the admin one.
  if (isUnder(pathname, "/m")) {
    if (!req.cookies.has("ctr_member_session")) {
      const login = new URL("/m/login", req.url);
      if (pathname !== "/m") login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

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
