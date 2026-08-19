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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)).*)"],
};
