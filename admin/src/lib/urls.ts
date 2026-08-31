/**
 * Absolute URLs for links that leave the app (emails, push payloads).
 *
 * Relative paths are useless in an inbox, and the request host cannot be
 * trusted to build one — an attacker-supplied Host header would poison every
 * reset link. ADMIN_URL is the configured origin and the only source here.
 */

function origin(): string {
  const configured = process.env.ADMIN_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3002";
  throw new Error("ADMIN_URL is not set — password reset links cannot be built.");
}

/** Absolute admin URL for `path` (which must start with "/"). */
export function adminUrl(path: string): string {
  return `${origin()}${path.startsWith("/") ? path : `/${path}`}`;
}
