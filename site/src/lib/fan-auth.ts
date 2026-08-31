import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, fanSessions, fans } from "@ctr/db";

const COOKIE = "ctr_fan_session";
const SESSION_MS = 90 * 24 * 3600 * 1000; // 90 days

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export type FanSession = {
  fan: { id: string; email: string; displayName: string; countryCode: string | null };
};

export async function createFanSession(fanId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(fanSessions).values({
    tokenHash: sha256(token),
    fanId,
    expiresAt: new Date(Date.now() + SESSION_MS),
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MS / 1000,
    path: "/",
  });
}

export async function destroyFanSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(fanSessions).where(eq(fanSessions.tokenHash, sha256(token)));
  store.delete(COOKIE);
}

/** Signs out every device — called after a password reset or change so a
 *  stolen session can't outlive the credential that granted it. */
export async function evictAllFanSessions(fanId: string) {
  await db.delete(fanSessions).where(eq(fanSessions.fanId, fanId));
}

export const getFanSession = cache(async (): Promise<FanSession | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      id: fans.id,
      email: fans.email,
      displayName: fans.displayName,
      countryCode: fans.countryCode,
    })
    .from(fanSessions)
    .innerJoin(fans, eq(fanSessions.fanId, fans.id))
    .where(
      and(
        eq(fanSessions.tokenHash, sha256(token)),
        gt(fanSessions.expiresAt, new Date()),
        isNull(fans.deactivatedAt),
      ),
    );
  return row ? { fan: row } : null;
});

export async function requireFan(): Promise<FanSession> {
  const session = await getFanSession();
  if (!session) redirect("/login");
  return session;
}
