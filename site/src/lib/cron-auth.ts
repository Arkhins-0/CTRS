import { timingSafeEqual } from "node:crypto";

/**
 * Fail-closed Bearer auth for /api/cron/* routes (the OpenLeague pattern): a
 * missing CRON_SECRET refuses to run rather than letting anyone trigger mass
 * email, and the comparison is constant-time so response timing can't leak
 * the secret. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
 * automatically when that env var is set on the project; the same header
 * also lets GitHub Actions or cron-job.org trigger the same endpoint.
 *
 * Returns null when CRON_SECRET itself is unconfigured (caller should 500),
 * false when the presented value doesn't match (401), true when it does.
 */
export function authorizedCronRequest(req: Request): boolean | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
