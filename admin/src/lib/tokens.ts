import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { adminVerificationTokens, db } from "@ctr/db";

/**
 * Single-use account tokens for password reset and email change.
 *
 * Only the sha256 of the token is ever stored, so the raw value lives solely
 * in the recipient's inbox. Consuming a token stamps `usedAt` inside the same
 * conditional UPDATE that checks it is unused and unexpired — two concurrent
 * redemptions therefore cannot both succeed.
 */

export type AdminTokenType = "password_reset" | "email_change";

const TTL_MS: Record<AdminTokenType, number> = {
  password_reset: 60 * 60 * 1000, // 1 hour — short, it is a takeover primitive
  email_change: 24 * 60 * 60 * 1000, // 24 hours
};

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/**
 * Issues a token and returns the RAW value — email it, never log or store it.
 * Any outstanding tokens of the same type for this user are revoked first, so
 * a fresh request always invalidates an older link.
 */
export async function issueToken(
  adminUserId: string,
  type: AdminTokenType,
  newEmail?: string,
): Promise<string> {
  await revokeTokens(adminUserId, type);

  const raw = randomBytes(32).toString("base64url");
  await db.insert(adminVerificationTokens).values({
    tokenHash: sha256(raw),
    adminUserId,
    type,
    newEmail: newEmail ?? null,
    expiresAt: new Date(Date.now() + TTL_MS[type]),
  });
  return raw;
}

/**
 * Redeems a token, returning its row on success and null when it is unknown,
 * expired, already used or of the wrong type. The UPDATE ... RETURNING is the
 * atomic claim: whichever request lands first is the only one that sees a row.
 */
export async function consumeToken(
  raw: string,
  type: AdminTokenType,
): Promise<{ adminUserId: string; newEmail: string | null } | null> {
  const rows = await db
    .update(adminVerificationTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(adminVerificationTokens.tokenHash, sha256(raw)),
        eq(adminVerificationTokens.type, type),
        isNull(adminVerificationTokens.usedAt),
        gt(adminVerificationTokens.expiresAt, new Date()),
      ),
    )
    .returning({
      adminUserId: adminVerificationTokens.adminUserId,
      newEmail: adminVerificationTokens.newEmail,
    });

  return rows[0] ?? null;
}

/**
 * Checks a token WITHOUT consuming it, for rendering a form on GET.
 *
 * Never use this to authorise a mutation — only consumeToken()'s conditional
 * UPDATE is atomic. This is purely so an expired link can show a useful page
 * instead of a form that fails on submit.
 */
export async function peekToken(raw: string, type: AdminTokenType): Promise<boolean> {
  const row = await db.query.adminVerificationTokens.findFirst({
    where: and(
      eq(adminVerificationTokens.tokenHash, sha256(raw)),
      eq(adminVerificationTokens.type, type),
      isNull(adminVerificationTokens.usedAt),
      gt(adminVerificationTokens.expiresAt, new Date()),
    ),
    columns: { tokenHash: true },
  });
  return Boolean(row);
}

/** Drops outstanding tokens — call after a password or email change lands. */
export async function revokeTokens(adminUserId: string, type?: AdminTokenType): Promise<void> {
  await db
    .delete(adminVerificationTokens)
    .where(
      type
        ? and(
            eq(adminVerificationTokens.adminUserId, adminUserId),
            eq(adminVerificationTokens.type, type),
          )
        : eq(adminVerificationTokens.adminUserId, adminUserId),
    );
}

/** Housekeeping: clear expired and long-consumed rows. */
export async function pruneTokens(): Promise<void> {
  await db
    .delete(adminVerificationTokens)
    .where(
      or(
        lt(adminVerificationTokens.expiresAt, new Date()),
        lt(adminVerificationTokens.usedAt, new Date(Date.now() - 7 * 24 * 3600 * 1000)),
      ),
    );
}
