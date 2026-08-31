"use server";

import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, newsletterIssues, newsletterSubscribers, PERMISSIONS, siteSettings, sponsors } from "@ctr/db";
import { newsletterBroadcastEmail, sendEmail, type SocialLink, type SponsorLogo } from "@ctr/email";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { sanitizeBodyHtml } from "@/components/editor/sanitize";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";

const idSchema = z.object({ subscriberId: z.string().uuid() });

export async function markUnsubscribedAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWSLETTER_VIEW);
  const { subscriberId } = idSchema.parse({ subscriberId: String(formData.get("subscriberId") ?? "") });

  const [before] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.id, subscriberId));
  if (!before) throw new Error("Subscriber not found");
  if (before.status === "unsubscribed") return;

  await db
    .update(newsletterSubscribers)
    .set({ status: "unsubscribed" })
    .where(eq(newsletterSubscribers.id, subscriberId));

  await writeAudit({
    actorId: session.user.id,
    action: "newsletter.update",
    entityType: "newsletter_subscriber",
    entityId: subscriberId,
    diff: { before: { status: before.status }, after: { status: "unsubscribed" } },
  });
  revalidatePath("/newsletter");
}

export async function deleteSubscriberAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWSLETTER_VIEW);
  const { subscriberId } = idSchema.parse({ subscriberId: String(formData.get("subscriberId") ?? "") });

  const [before] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.id, subscriberId));
  if (!before) throw new Error("Subscriber not found");

  await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, subscriberId));

  await writeAudit({
    actorId: session.user.id,
    action: "newsletter.delete",
    entityType: "newsletter_subscriber",
    entityId: subscriberId,
    diff: { before: { email: before.email, status: before.status, source: before.source } },
  });
  revalidatePath("/newsletter");
}

/* ── Broadcast composer ──────────────────────────────────────────────────── */

const composeSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required.").max(200),
});

/** Creates an empty draft and hands off to its editor — mirrors news/new → news/[id]. */
export async function createBroadcastDraftAction() {
  const session = await requirePermission(PERMISSIONS.NEWSLETTER_MANAGE);
  const [row] = await db
    .insert(newsletterIssues)
    .values({ kind: "broadcast", subject: "Untitled issue", status: "draft", createdBy: session.user.id })
    .returning({ id: newsletterIssues.id });
  redirect(`/newsletter/${row.id}`);
}

async function loadEditableDraft(id: string) {
  const [row] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, id));
  if (!row) redirect("/newsletter?error=not-found");
  if (row.kind !== "broadcast") redirect("/newsletter?error=not-found");
  // A sent issue is a historical record — never let a save silently rewrite
  // what recipients actually received.
  if (row.status !== "draft") redirect(`/newsletter/${id}?error=already-sent`);
  return row;
}

export async function saveBroadcastDraftAction(formData: FormData) {
  await requirePermission(PERMISSIONS.NEWSLETTER_MANAGE);
  const id = String(formData.get("id") ?? "");
  await loadEditableDraft(id);

  const parsed = composeSchema.safeParse({ subject: formData.get("subject") });
  if (!parsed.success) redirect(`/newsletter/${id}?error=invalid`);

  await db
    .update(newsletterIssues)
    .set({
      subject: parsed.data.subject,
      bodyJson: String(formData.get("body") ?? ""),
      bodyHtml: sanitizeBodyHtml(String(formData.get("body_html") ?? "")),
    })
    .where(eq(newsletterIssues.id, id));

  revalidatePath(`/newsletter/${id}`);
  redirect(`/newsletter/${id}?saved=1`);
}

export async function deleteBroadcastDraftAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWSLETTER_MANAGE);
  const id = String(formData.get("id") ?? "");
  const draft = await loadEditableDraft(id);

  await db.delete(newsletterIssues).where(eq(newsletterIssues.id, id));
  await writeAudit({
    actorId: session.user.id,
    action: "newsletter.broadcast-delete",
    entityType: "newsletter_issue",
    entityId: id,
    diff: { before: { subject: draft.subject } },
  });
  redirect("/newsletter");
}

/**
 * Sends a one-off broadcast to every confirmed subscriber.
 *
 * Saves the current form content first — this is "save and send" in one
 * action, the same intent pattern as the article editor's Publish button —
 * then renders and sends individually per recipient (each gets their own
 * unsubscribe link) with per-recipient fault tolerance, matching the digest
 * cron's send loop so the two paths behave identically under partial failure.
 */
export async function sendBroadcastAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWSLETTER_MANAGE);
  const id = String(formData.get("id") ?? "");
  await loadEditableDraft(id);

  const parsed = composeSchema.safeParse({ subject: formData.get("subject") });
  if (!parsed.success) redirect(`/newsletter/${id}?error=invalid`);

  const bodyHtml = sanitizeBodyHtml(String(formData.get("body_html") ?? ""));
  if (!bodyHtml.trim()) redirect(`/newsletter/${id}?error=empty-body`);

  await db
    .update(newsletterIssues)
    .set({
      subject: parsed.data.subject,
      bodyJson: String(formData.get("body") ?? ""),
      bodyHtml,
      status: "sending",
    })
    .where(eq(newsletterIssues.id, id));

  // Backfill any confirmed subscriber still missing an unsubscribe token —
  // covers rows created before this feature shipped.
  const missing = await db
    .select({ id: newsletterSubscribers.id })
    .from(newsletterSubscribers)
    .where(and(eq(newsletterSubscribers.status, "confirmed"), isNull(newsletterSubscribers.unsubscribeToken)));
  for (const row of missing) {
    await db
      .update(newsletterSubscribers)
      .set({ unsubscribeToken: randomBytes(24).toString("hex") })
      .where(eq(newsletterSubscribers.id, row.id));
  }

  const recipients = await db
    .select({ email: newsletterSubscribers.email, token: newsletterSubscribers.unsubscribeToken })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "confirmed"));

  const activeSponsors = await db.query.sponsors.findMany({
    where: eq(sponsors.isActive, true),
    orderBy: (s, { asc }) => [asc(s.sort)],
    limit: 6,
    columns: { name: true, url: true },
    with: { logo: { columns: { path: true } } },
  });
  const sponsorLogos: SponsorLogo[] = activeSponsors
    .filter((s): s is typeof s & { logo: { path: string } } => Boolean(s.logo))
    .map((s) => ({
      name: s.name,
      url: s.url ?? "",
      logoUrl: publicUrl(variantKey(s.logo.path, "card")),
    }));

  const base = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  const editionLine = `SPECIAL BULLETIN · ${format(new Date(), "d MMM yyyy")}`;
  const [socialRow] = await db.select().from(siteSettings).where(eq(siteSettings.key, "social_links"));
  const socialLinks = (socialRow?.value as SocialLink[] | undefined) ?? [];

  let sent = 0;
  let failed = 0;
  const sentHtml = newsletterBroadcastEmail({
    editionLine,
    subject: parsed.data.subject,
    bodyHtml,
    sponsors: sponsorLogos,
    socialLinks,
    unsubscribeUrl: `${base}/newsletter/unsubscribe/{token}`,
  }).html;

  for (const r of recipients) {
    const rendered = newsletterBroadcastEmail({
      editionLine,
      subject: parsed.data.subject,
      bodyHtml,
      sponsors: sponsorLogos,
      socialLinks,
      unsubscribeUrl: `${base}/newsletter/unsubscribe/${r.token}`,
    });
    try {
      await sendEmail({ to: r.email, subject: rendered.subject, html: rendered.html, text: rendered.text });
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`newsletter broadcast failed for ${r.email}`, err);
    }
  }

  await db
    .update(newsletterIssues)
    .set({ status: "sent", sentHtml, sentAt: new Date(), sentCount: sent, failedCount: failed })
    .where(eq(newsletterIssues.id, id));

  await writeAudit({
    actorId: session.user.id,
    action: "newsletter.broadcast-send",
    entityType: "newsletter_issue",
    entityId: id,
    diff: { after: { subject: parsed.data.subject, sent, failed, total: recipients.length } },
  });

  revalidatePath("/newsletter");
  redirect(`/newsletter/${id}?sent=${sent}&failed=${failed}`);
}
