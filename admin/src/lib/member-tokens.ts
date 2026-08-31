import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, memberPasswordResetTokens } from "@ctr/db";

/**
 * Self-service password reset tokens for members. Same shape and discipline
 * as admin/src/lib/tokens.ts: only the sha256 is stored, single-use, claimed
 * by a conditional UPDATE so concurrent redemptions can't both win.
 */

const TTL_MS = 60 * 60 * 1000; // 1 hour, matching the admin reset link

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Issues a token and returns the RAW value — email it, never store it. */
export async function issueMemberResetToken(memberId: string): Promise<string> {
  await db.delete(memberPasswordResetTokens).where(eq(memberPasswordResetTokens.memberId, memberId));

  const raw = randomBytes(32).toString("base64url");
  await db.insert(memberPasswordResetTokens).values({
    tokenHash: sha256(raw),
    memberId,
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  return raw;
}

/** Checks a token WITHOUT consuming it, for rendering the form on GET. */
export async function peekMemberResetToken(raw: string): Promise<boolean> {
  const row = await db.query.memberPasswordResetTokens.findFirst({
    where: and(
      eq(memberPasswordResetTokens.tokenHash, sha256(raw)),
      isNull(memberPasswordResetTokens.usedAt),
      gt(memberPasswordResetTokens.expiresAt, new Date()),
    ),
    columns: { tokenHash: true },
  });
  return Boolean(row);
}

/** Redeems a token; returns the member id on success, null otherwise. */
export async function consumeMemberResetToken(raw: string): Promise<string | null> {
  const rows = await db
    .update(memberPasswordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(memberPasswordResetTokens.tokenHash, sha256(raw)),
        isNull(memberPasswordResetTokens.usedAt),
        gt(memberPasswordResetTokens.expiresAt, new Date()),
      ),
    )
    .returning({ memberId: memberPasswordResetTokens.memberId });
  return rows[0]?.memberId ?? null;
}
