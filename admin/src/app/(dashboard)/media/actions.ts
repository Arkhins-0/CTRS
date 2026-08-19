"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, media, PERMISSIONS, TAGS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";
import { deleteObject } from "@/lib/storage";
import { processAndStoreImage } from "@/components/media/process-image";
import { MEDIA_VARIANTS, variantKey } from "@/components/media/variants";
import { findMediaUsage } from "./usage";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // per file

/** Upload zone on /media — accepts multiple image files. */
export async function uploadMediaAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.MEDIA_MANAGE); // 1. RBAC

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  let uploaded = 0;
  for (const file of files) {
    // 2. validate — images only, sane size, non-empty name
    const check = z
      .object({
        name: z.string().min(1).max(255),
        type: z.string().regex(/^image\//),
        size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
      })
      .safeParse({ name: file.name, type: file.type, size: file.size });
    if (!check.success) continue;

    // 3. mutation — process, store to S3 (+3 variants) and insert one row
    const buffer = Buffer.from(await file.arrayBuffer());
    const row = await processAndStoreImage({
      buffer,
      filename: file.name,
      uploadedBy: session.user.id,
    });

    // 4. audit (per file)
    await writeAudit({
      actorId: session.user.id,
      action: "media.upload",
      entityType: "media",
      entityId: row.id,
      diff: { after: { path: row.path, filename: row.filename, sizeBytes: row.sizeBytes } },
    });
    uploaded += 1;
  }

  // 5. revalidateSite intentionally skipped — media isn't rendered publicly
  //    until something references it.
  // 6. refresh admin UI
  revalidatePath("/media");
  redirect(uploaded > 0 ? "/media" : "/media?error=no-valid-files");
}

const metaSchema = z.object({
  id: z.string().uuid(),
  alt: z.string().max(2000).transform((v) => v.trim() || null),
  caption: z.string().max(5000).transform((v) => v.trim() || null),
  credit: z.string().max(255).transform((v) => v.trim() || null),
});

/** Alt / caption / credit form on /media/[id]. */
export async function updateMediaAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.MEDIA_MANAGE); // 1

  const parsed = metaSchema.safeParse({
    id: formData.get("id"),
    alt: String(formData.get("alt") ?? ""),
    caption: String(formData.get("caption") ?? ""),
    credit: String(formData.get("credit") ?? ""),
  }); // 2
  if (!parsed.success) redirect("/media?error=invalid");
  const data = parsed.data;

  const [before] = await db.select().from(media).where(eq(media.id, data.id));
  if (!before) redirect("/media?error=not-found");

  await db
    .update(media)
    .set({ alt: data.alt, caption: data.caption, credit: data.credit })
    .where(eq(media.id, data.id)); // 3

  await writeAudit({
    actorId: session.user.id,
    action: "media.update",
    entityType: "media",
    entityId: data.id,
    diff: {
      before: { alt: before.alt, caption: before.caption, credit: before.credit },
      after: { alt: data.alt, caption: data.caption, credit: data.credit },
    },
  }); // 4

  // 5 — alt/caption/credit surface wherever the image is referenced
  await revalidateSite([TAGS.articles, TAGS.galleries, TAGS.videos, TAGS.home]);

  revalidatePath(`/media/${data.id}`); // 6
  redirect(`/media/${data.id}?saved=1`);
}

/** Delete on /media/[id] — refused while the media is referenced anywhere. */
export async function deleteMediaAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.MEDIA_MANAGE); // 1

  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: formData.get("id") }); // 2
  if (!parsed.success) redirect("/media?error=invalid");
  const { id } = parsed.data;

  const [row] = await db.select().from(media).where(eq(media.id, id));
  if (!row) redirect("/media?error=not-found");

  const usage = await findMediaUsage(id);
  if (usage.length > 0) redirect(`/media/${id}?error=in-use`);

  // 3 — remove the original + all derived variants from S3, then the row.
  // S3 failures must not orphan the DB row invisibly, so delete objects first
  // and tolerate individual misses (allSettled).
  await Promise.allSettled([
    deleteObject(row.path),
    ...MEDIA_VARIANTS.map((v) => deleteObject(variantKey(row.path, v))),
  ]);
  await db.delete(media).where(eq(media.id, id));

  await writeAudit({
    actorId: session.user.id,
    action: "media.delete",
    entityType: "media",
    entityId: id,
    diff: { before: { path: row.path, filename: row.filename } },
  }); // 4

  // 5 — nothing public referenced this media (guard above), so no site tags
  //     need invalidating.
  revalidatePath("/media"); // 6
  redirect("/media");
}
