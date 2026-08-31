import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, fanPasswordResetTokens } from "@ctr/db";

/**
 * Self-service password reset tokens for fans. Same shape and discipline as
 * admin/src/lib/tokens.ts and admin/src/lib/member-tokens.ts: only the
 * sha256 is stored, single-use, claimed by a conditional UPDATE so
 * concurrent redemptions can't both win.
 */

const TTL_MS = 60 * 60 * 1000; // 1 hour, matching the admin/member reset link

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Issues a token and returns the RAW value — email it, never store it. */
export async function issueFanResetToken(fanId: string): Promise<string> {
  await db.delete(fanPasswordResetTokens).where(eq(fanPasswordResetTokens.fanId, fanId));

  const raw = randomBytes(32).toString("base64url");
  await db.insert(fanPasswordResetTokens).values({
    tokenHash: sha256(raw),
    fanId,
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  return raw;
}

/** Checks a token WITHOUT consuming it, for rendering the form on GET. */
export async function peekFanResetToken(raw: string): Promise<boolean> {
  const row = await db.query.fanPasswordResetTokens.findFirst({
    where: and(
      eq(fanPasswordResetTokens.tokenHash, sha256(raw)),
      isNull(fanPasswordResetTokens.usedAt),
      gt(fanPasswordResetTokens.expiresAt, new Date()),
    ),
    columns: { tokenHash: true },
  });
  return Boolean(row);
}

/** Redeems a token; returns the fan id on success, null otherwise. */
export async function consumeFanResetToken(raw: string): Promise<string | null> {
  const rows = await db
    .update(fanPasswordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(fanPasswordResetTokens.tokenHash, sha256(raw)),
        isNull(fanPasswordResetTokens.usedAt),
        gt(fanPasswordResetTokens.expiresAt, new Date()),
      ),
    )
    .returning({ fanId: fanPasswordResetTokens.fanId });
  return rows[0]?.fanId ?? null;
}
