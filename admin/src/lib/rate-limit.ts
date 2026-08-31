import { and, eq, lt, sql } from "drizzle-orm";
import { db, rateLimitBuckets } from "@ctr/db";

/**
 * Durable fixed-window rate limiter.
 *
 * Server actions POST to page URLs, so edge middleware never sees them, and
 * in-memory counters die with every serverless cold start. Counting in the
 * database is the only thing that actually holds across both.
 *
 * FAILS OPEN: if the database is unreachable the caller is allowed through.
 * A limiter outage must not lock every admin out of signing in — the login
 * path still enforces bcrypt and the per-account lockout underneath this.
 */

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  // Fixed window: everything in the same slice shares one row.
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);
  const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000));

  try {
    // Atomic upsert-and-increment — no read-then-write race between instances.
    const rows = await db
      .insert(rateLimitBuckets)
      .values({ key, windowStart, count: 1, expiresAt })
      .onConflictDoUpdate({
        target: [rateLimitBuckets.key, rateLimitBuckets.windowStart],
        set: { count: sql`${rateLimitBuckets.count} + 1` },
      })
      .returning({ count: rateLimitBuckets.count });

    const count = rows[0]?.count ?? 1;
    return { allowed: count <= limit, retryAfterSeconds };
  } catch (err) {
    console.error("[rate-limit] check failed, allowing request", err);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** Housekeeping: drop windows that have already closed. */
export async function pruneRateLimits(): Promise<void> {
  await db.delete(rateLimitBuckets).where(lt(rateLimitBuckets.expiresAt, new Date()));
}

/** Clears a key's current window — call after a successful sign-in. */
export async function clearRateLimit(key: string, windowMs: number): Promise<void> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  await db
    .delete(rateLimitBuckets)
    .where(and(eq(rateLimitBuckets.key, key), eq(rateLimitBuckets.windowStart, windowStart)))
    .catch(() => {
      // best effort — the window expires on its own
    });
}
