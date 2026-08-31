"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { adminUsers, db } from "@ctr/db";
import { adminEmailChangedNoticeEmail, sendEmail } from "@ctr/email";
import { writeAudit } from "@/lib/audit";
import { evictAllSessions } from "@/lib/auth";
import { consumeToken } from "@/lib/tokens";

/*
 * Declared (not an arrow) with an explicit `never` return so TypeScript
 * narrows control flow past every call — an arrow assigned to a const does
 * not get that treatment.
 */
function fail(token: string, status: string): never {
  redirect(`/confirm-email/${token}?status=${status}`);
}

/**
 * Applies a confirmed email change.
 *
 * Consumed on POST only — see the note in the reset-password action about mail
 * scanners burning single-use tokens on GET.
 */
export async function confirmEmailChangeAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  const claim = await consumeToken(token, "email_change");
  if (!claim?.newEmail) fail(token, "expired");
  const { adminUserId, newEmail } = claim;

  const before = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, adminUserId),
    columns: { email: true, displayName: true },
  });
  if (!before) fail(token, "expired");

  /*
   * The address may have been claimed by someone else between request and
   * confirm, so this can still fail on the unique index. Fail closed rather
   * than surfacing a database error.
   */
  try {
    await db.update(adminUsers).set({ email: newEmail }).where(eq(adminUsers.id, adminUserId));
  } catch (err) {
    console.error("[confirm-email] update failed", err);
    fail(token, "taken");
  }

  // The sign-in identity changed; force every session to re-authenticate.
  await evictAllSessions(adminUserId);

  await writeAudit({
    actorId: adminUserId,
    action: "account.email-change",
    entityType: "admin_user",
    entityId: adminUserId,
    diff: { before: { email: before.email }, after: { email: newEmail } },
  });

  // Tell the OLD address — this is the tripwire if the change wasn't theirs.
  try {
    await sendEmail({
      to: before.email,
      ...adminEmailChangedNoticeEmail({
        displayName: before.displayName,
        newEmail,
        supportEmail: process.env.EMAIL_FROM ?? "support@ctrsports.in",
      }),
    });
  } catch (err) {
    console.error("[confirm-email] notice failed", err);
  }

  redirect("/login?status=email-changed");
}
