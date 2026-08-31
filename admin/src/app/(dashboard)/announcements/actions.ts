"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { announcements, db, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { pushConfigured, sendPushToAll } from "@/lib/push";

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  body: z.string().trim().min(1, "Message is required.").max(500),
  url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), {
      message: "Link must be site-relative (/results/…) or an http(s) URL.",
    })
    .optional(),
});

/** Create an announcement and push it to every subscribed device. */
export async function sendAnnouncementAction(formData: FormData): Promise<void> {
  const admin = await requirePermission(PERMISSIONS.NEWS_MANAGE);

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    url: formData.get("url") ?? "",
  });
  if (!parsed.success) {
    redirect(
      `/announcements?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Check the form and try again.",
      )}`,
    );
  }
  if (!pushConfigured()) {
    redirect(
      "/announcements?error=" +
        encodeURIComponent(
          "Push is not configured — set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
        ),
    );
  }
  const data = parsed.data;
  const url = data.url || "/";
  // push payloads carry an absolute site URL so a tap opens the right origin
  // no matter where the device subscribed (public site or admin dashboard)
  const siteBase = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  const absoluteUrl = url.startsWith("/") ? `${siteBase}${url}` : url;

  const [row] = await db
    .insert(announcements)
    .values({ title: data.title, body: data.body, url, createdBy: admin.user.id })
    .returning();

  const result = await sendPushToAll({ title: data.title, body: data.body, url: absoluteUrl });

  await db
    .update(announcements)
    .set({ sentAt: new Date(), sentCount: result.sent, failedCount: result.failed })
    .where(eq(announcements.id, row.id));

  await writeAudit({
    actorId: admin.user.id,
    action: "announcement.send",
    entityType: "announcement",
    entityId: row.id,
    diff: { after: { title: data.title, url, ...result } },
  });

  revalidatePath("/announcements");
  redirect(`/announcements?sent=${result.sent}&total=${result.total}`);
}
