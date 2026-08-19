"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { slug as slugify } from "github-slugger";
import { and, asc, eq, ne } from "drizzle-orm";
import { db, galleries, galleryItems, PERMISSIONS, TAGS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";

async function uniqueGallerySlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await db
      .select({ id: galleries.id })
      .from(galleries)
      .where(
        excludeId
          ? and(eq(galleries.slug, candidate), ne(galleries.id, excludeId))
          : eq(galleries.slug, candidate),
      )
      .limit(1);
    if (clash.length === 0) return candidate;
    candidate = `${base}-${n++}`;
  }
}

/* ── Gallery meta ────────────────────────────────────────────────────────── */

export async function createGalleryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.VIDEOS_MANAGE); // 1

  const parsed = z
    .object({
      title: z.string().trim().min(1).max(255),
      description: z.string().max(10000).transform((v) => v.trim() || null),
    })
    .safeParse({
      title: formData.get("title"),
      description: String(formData.get("description") ?? ""),
    }); // 2
  if (!parsed.success) redirect("/galleries/new?error=invalid");
  const data = parsed.data;

  const gallerySlug = await uniqueGallerySlug(
    slugify(data.title).slice(0, 190) || `gallery-${randomUUID().slice(0, 8)}`,
  );

  const [row] = await db
    .insert(galleries)
    .values({ title: data.title, slug: gallerySlug, description: data.description, status: "draft" })
    .returning(); // 3

  await writeAudit({
    actorId: session.user.id,
    action: "gallery.create",
    entityType: "gallery",
    entityId: row.id,
    diff: { after: { title: data.title, slug: gallerySlug } },
  }); // 4

  await revalidateSite([TAGS.galleries]); // 5
  revalidatePath("/galleries"); // 6
  redirect(`/galleries/${row.id}`);
}

const gallerySchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
  slug: z.string().trim().max(200),
  description: z.string().max(10000).transform((v) => v.trim() || null),
  intent: z.enum(["save", "publish", "unpublish", "archive"]),
});

export async function saveGalleryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.VIDEOS_MANAGE); // 1

  const rawId = String(formData.get("id") ?? "");
  const parsed = gallerySchema.safeParse({
    id: rawId,
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    intent: String(formData.get("intent") ?? "save"),
  }); // 2
  if (!parsed.success) {
    redirect(rawId ? `/galleries/${rawId}?error=invalid` : "/galleries?error=invalid");
  }
  const data = parsed.data;

  const [before] = await db.select().from(galleries).where(eq(galleries.id, data.id));
  if (!before) redirect("/galleries?error=not-found");

  const finalSlug = await uniqueGallerySlug(
    slugify(data.slug || data.title).slice(0, 190) || before.slug,
    data.id,
  );

  let status = before.status;
  let publishedAt = before.publishedAt;
  if (data.intent === "publish") {
    status = "published";
    publishedAt = before.publishedAt ?? new Date();
  } else if (data.intent === "unpublish") {
    status = "draft";
  } else if (data.intent === "archive") {
    status = "archived";
  }

  await db
    .update(galleries)
    .set({ title: data.title, slug: finalSlug, description: data.description, status, publishedAt })
    .where(eq(galleries.id, data.id)); // 3

  await writeAudit({
    actorId: session.user.id,
    action: `gallery.${data.intent}`,
    entityType: "gallery",
    entityId: data.id,
    diff: {
      before: { title: before.title, slug: before.slug, status: before.status },
      after: { title: data.title, slug: finalSlug, status },
    },
  }); // 4

  await revalidateSite([TAGS.galleries]); // 5
  revalidatePath("/galleries"); // 6
  revalidatePath(`/galleries/${data.id}`);
  redirect(`/galleries/${data.id}?saved=1`);
}

export async function deleteGalleryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.VIDEOS_MANAGE); // 1

  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: formData.get("id") }); // 2
  if (!parsed.success) redirect("/galleries?error=invalid");
  const { id } = parsed.data;

  const [row] = await db.select().from(galleries).where(eq(galleries.id, id));
  if (!row) redirect("/galleries?error=not-found");

  await db.delete(galleries).where(eq(galleries.id, id)); // 3 — items cascade

  await writeAudit({
    actorId: session.user.id,
    action: "gallery.delete",
    entityType: "gallery",
    entityId: id,
    diff: { before: { title: row.title, slug: row.slug } },
  }); // 4

  await revalidateSite([TAGS.galleries]); // 5
  revalidatePath("/galleries"); // 6
  redirect("/galleries");
}

/* ── Items ───────────────────────────────────────────────────────────────── */

const itemKeySchema = z.object({
  galleryId: z.string().uuid(),
  mediaId: z.string().uuid(),
});

async function orderedItems(galleryId: string) {
  return db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.galleryId, galleryId))
    .orderBy(asc(galleryItems.sort), asc(galleryItems.mediaId));
}

export async function addGalleryItemAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.VIDEOS_MANAGE); // 1

  const parsed = itemKeySchema.safeParse({
    galleryId: formData.get("galleryId"),
    mediaId: formData.get("mediaId"),
  }); // 2
  if (!parsed.success) {
    const gid = String(formData.get("galleryId") ?? "");
    redirect(gid ? `/galleries/${gid}?error=pick-image` : "/galleries?error=invalid");
  }
  const { galleryId, mediaId } = parsed.data;

  const items = await orderedItems(galleryId);
  const nextSort = items.length > 0 ? Math.max(...items.map((i) => i.sort)) + 1 : 0;

  await db
    .insert(galleryItems)
    .values({ galleryId, mediaId, sort: nextSort })
    .onConflictDoNothing(); // 3 — PK(galleryId, mediaId) makes re-adds a no-op

  await writeAudit({
    actorId: session.user.id,
    action: "gallery.item-add",
    entityType: "gallery",
    entityId: galleryId,
    diff: { after: { mediaId, sort: nextSort } },
  }); // 4

  await revalidateSite([TAGS.galleries]); // 5
  revalidatePath(`/galleries/${galleryId}`); // 6
  redirect(`/galleries/${galleryId}`);
}

export async function updateGalleryItemCaptionAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.VIDEOS_MANAGE); // 1

  const parsed = itemKeySchema
    .extend({ captionOverride: z.string().max(5000).transform((v) => v.trim() || null) })
    .safeParse({
      galleryId: formData.get("galleryId"),
      mediaId: formData.get("mediaId"),
      captionOverride: String(formData.get("captionOverride") ?? ""),
    }); // 2
  if (!parsed.success) redirect("/galleries?error=invalid");
  const { galleryId, mediaId, captionOverride } = parsed.data;

  await db
    .update(galleryItems)
    .set({ captionOverride })
    .where(and(eq(galleryItems.galleryId, galleryId), eq(galleryItems.mediaId, mediaId))); // 3

  await writeAudit({
    actorId: session.user.id,
    action: "gallery.item-caption",
    entityType: "gallery",
    entityId: galleryId,
    diff: { after: { mediaId, captionOverride } },
  }); // 4

  await revalidateSite([TAGS.galleries]); // 5
  revalidatePath(`/galleries/${galleryId}`); // 6
  redirect(`/galleries/${galleryId}`);
}

export async function moveGalleryItemAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.VIDEOS_MANAGE); // 1

  const parsed = itemKeySchema
    .extend({ dir: z.enum(["up", "down"]) })
    .safeParse({
      galleryId: formData.get("galleryId"),
      mediaId: formData.get("mediaId"),
      dir: formData.get("dir"),
    }); // 2
  if (!parsed.success) redirect("/galleries?error=invalid");
  const { galleryId, mediaId, dir } = parsed.data;

  const items = await orderedItems(galleryId);
  const index = items.findIndex((i) => i.mediaId === mediaId);
  const target = dir === "up" ? index - 1 : index + 1;

  if (index !== -1 && target >= 0 && target < items.length) {
    // Swap in the ordered array, then persist sort = index for every item —
    // this also normalises any duplicate sort values.
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await db.transaction(async (tx) => {
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].sort !== i) {
          await tx
            .update(galleryItems)
            .set({ sort: i })
            .where(
              and(
                eq(galleryItems.galleryId, galleryId),
                eq(galleryItems.mediaId, reordered[i].mediaId),
              ),
            );
        }
      }
    }); // 3

    await writeAudit({
      actorId: session.user.id,
      action: "gallery.item-move",
      entityType: "gallery",
      entityId: galleryId,
      diff: { after: { mediaId, dir } },
    }); // 4

    await revalidateSite([TAGS.galleries]); // 5
  }

  revalidatePath(`/galleries/${galleryId}`); // 6
  redirect(`/galleries/${galleryId}`);
}

export async function removeGalleryItemAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.VIDEOS_MANAGE); // 1

  const parsed = itemKeySchema.safeParse({
    galleryId: formData.get("galleryId"),
    mediaId: formData.get("mediaId"),
  }); // 2
  if (!parsed.success) redirect("/galleries?error=invalid");
  const { galleryId, mediaId } = parsed.data;

  await db
    .delete(galleryItems)
    .where(and(eq(galleryItems.galleryId, galleryId), eq(galleryItems.mediaId, mediaId))); // 3

  await writeAudit({
    actorId: session.user.id,
    action: "gallery.item-remove",
    entityType: "gallery",
    entityId: galleryId,
    diff: { before: { mediaId } },
  }); // 4

  await revalidateSite([TAGS.galleries]); // 5
  revalidatePath(`/galleries/${galleryId}`); // 6
  redirect(`/galleries/${galleryId}`);
}
