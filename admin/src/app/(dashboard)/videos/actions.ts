"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { slug as slugify } from "github-slugger";
import { and, eq, ne } from "drizzle-orm";
import { db, PERMISSIONS, TAGS, videos } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";

async function uniqueVideoSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await db
      .select({ id: videos.id })
      .from(videos)
      .where(
        excludeId
          ? and(eq(videos.slug, candidate), ne(videos.id, excludeId))
          : eq(videos.slug, candidate),
      )
      .limit(1);
    if (clash.length === 0) return candidate;
    candidate = `${base}-${n++}`;
  }
}

const videoSchema = z.object({
  id: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().uuid().nullable()),
  title: z.string().trim().min(1).max(255),
  slug: z.string().trim().max(200),
  description: z.string().max(10000).transform((v) => v.trim() || null),
  provider: z.enum(["youtube", "file"]),
  externalId: z.string().max(120).transform((v) => v.trim() || null),
  mediaId: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().uuid().nullable()),
  thumbnailMediaId: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().uuid().nullable()),
  durationSeconds: z
    .string()
    .transform((v) => (v.trim() === "" ? null : Number.parseInt(v, 10)))
    .pipe(z.number().int().positive().nullable()),
  intent: z.enum(["save", "publish", "unpublish", "archive"]),
});

export async function saveVideoAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.VIDEOS_MANAGE); // 1

  const parsed = videoSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    provider: String(formData.get("provider") ?? "youtube"),
    externalId: String(formData.get("externalId") ?? ""),
    mediaId: String(formData.get("mediaId") ?? ""),
    thumbnailMediaId: String(formData.get("thumbnailMediaId") ?? ""),
    durationSeconds: String(formData.get("durationSeconds") ?? ""),
    intent: String(formData.get("intent") ?? "save"),
  }); // 2
  if (!parsed.success) redirect("/videos?error=invalid");
  const data = parsed.data;

  const slugBase =
    slugify(data.slug || data.title).slice(0, 190) || `video-${randomUUID().slice(0, 8)}`;
  const finalSlug = await uniqueVideoSlug(slugBase, data.id ?? undefined);

  // The source is either a YouTube id or an uploaded file — never both.
  const externalId = data.provider === "youtube" ? data.externalId : null;
  const mediaId = data.provider === "file" ? data.mediaId : null;

  const before = data.id
    ? (await db.select().from(videos).where(eq(videos.id, data.id)))[0]
    : undefined;
  if (data.id && !before) redirect("/videos?error=not-found");

  let status = before?.status ?? "draft";
  let publishedAt = before?.publishedAt ?? null;
  if (data.intent === "publish") {
    status = "published";
    publishedAt = before?.publishedAt ?? new Date();
  } else if (data.intent === "unpublish") {
    status = "draft";
  } else if (data.intent === "archive") {
    status = "archived";
  }

  const values = {
    title: data.title,
    slug: finalSlug,
    description: data.description,
    provider: data.provider,
    externalId,
    mediaId,
    thumbnailMediaId: data.thumbnailMediaId,
    durationSeconds: data.durationSeconds,
    status,
    publishedAt,
  };

  let videoId: string;
  if (before) {
    await db.update(videos).set(values).where(eq(videos.id, before.id)); // 3
    videoId = before.id;
  } else {
    const [row] = await db.insert(videos).values(values).returning(); // 3
    videoId = row.id;
  }

  await writeAudit({
    actorId: session.user.id,
    action: before ? `video.${data.intent}` : "video.create",
    entityType: "video",
    entityId: videoId,
    diff: {
      before: before ? { title: before.title, slug: before.slug, status: before.status } : undefined,
      after: { title: data.title, slug: finalSlug, status, provider: data.provider },
    },
  }); // 4

  const siteTags = [TAGS.videos, TAGS.video(finalSlug), TAGS.home];
  if (before && before.slug !== finalSlug) siteTags.push(TAGS.video(before.slug));
  await revalidateSite(siteTags); // 5

  revalidatePath("/videos"); // 6
  revalidatePath(`/videos/${videoId}`);
  redirect(`/videos/${videoId}?saved=1`);
}

export async function deleteVideoAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.VIDEOS_MANAGE); // 1

  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: formData.get("id") }); // 2
  if (!parsed.success) redirect("/videos?error=invalid");
  const { id } = parsed.data;

  const [row] = await db.select().from(videos).where(eq(videos.id, id));
  if (!row) redirect("/videos?error=not-found");

  await db.delete(videos).where(eq(videos.id, id)); // 3 — videoTags cascade

  await writeAudit({
    actorId: session.user.id,
    action: "video.delete",
    entityType: "video",
    entityId: id,
    diff: { before: { title: row.title, slug: row.slug, status: row.status } },
  }); // 4

  await revalidateSite([TAGS.videos, TAGS.video(row.slug), TAGS.home]); // 5
  revalidatePath("/videos"); // 6
  redirect("/videos");
}
