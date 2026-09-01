"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, media, PERMISSIONS, TAGS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  createFolder,
  deleteFolder,
  deleteMediaById,
  moveMedia,
  uploadImages,
} from "@/lib/media-ops";
import { revalidateSite } from "@/lib/revalidate";
import { normalizeFolder } from "@/components/media/folders";

/** Where to send the browser back to after a folder-scoped action. */
function folderHref(folder: string, extra?: string): string {
  const params = new URLSearchParams();
  if (folder) params.set("folder", folder);
  if (extra) params.set("error", extra);
  const qs = params.toString();
  return qs ? `/media?${qs}` : "/media";
}

/** Upload zone on /media — accepts multiple image files into one folder. */
export async function uploadMediaAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.MEDIA_MANAGE); // 1. RBAC

  const folder = normalizeFolder(formData.get("folder")?.toString()); // 2
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  // 3. mutation — validate, process, store to S3 (+ variants), insert rows.
  //    4. per-file audit happens inside uploadImages.
  const { items } = await uploadImages({ files, folder, actorId: session.user.id });

  // 5. revalidateSite intentionally skipped — media isn't rendered publicly
  //    until something references it.
  // 6. refresh admin UI
  revalidatePath("/media");
  redirect(items.length > 0 ? folderHref(folder) : folderHref(folder, "no-valid-files"));
}

/** "New folder" form on /media. */
export async function createFolderAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.MEDIA_MANAGE); // 1

  const parent = normalizeFolder(formData.get("parent")?.toString()); // 2
  const name = formData.get("name")?.toString() ?? "";
  const path = parent ? `${parent}/${name}` : name;

  const result = await createFolder(path, session.user.id); // 3 + 4 (audits inside)

  revalidatePath("/media"); // 6
  redirect(result.ok ? folderHref(result.path) : folderHref(parent, `folder-${result.reason}`));
}

/** Delete-folder button on /media — only ever removes empty folders. */
export async function deleteFolderAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.MEDIA_MANAGE); // 1

  const parsed = z
    .object({ path: z.string().min(1).max(300) })
    .safeParse({ path: formData.get("path") }); // 2
  if (!parsed.success) redirect(folderHref("", "invalid"));

  const result = await deleteFolder(parsed.data.path, session.user.id); // 3 + 4
  const parent = parsed.data.path.slice(0, Math.max(0, parsed.data.path.lastIndexOf("/")));

  revalidatePath("/media"); // 6
  redirect(result.ok ? folderHref(parent) : folderHref(parent, `folder-${result.reason}`));
}

/** "Folder" select on /media/[id]. */
export async function moveMediaAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.MEDIA_MANAGE); // 1

  const parsed = z
    .object({ id: z.string().uuid(), folder: z.string().max(300) })
    .safeParse({ id: formData.get("id"), folder: formData.get("folder") ?? "" }); // 2
  if (!parsed.success) redirect("/media?error=invalid");

  const ok = await moveMedia(parsed.data.id, parsed.data.folder, session.user.id); // 3 + 4
  if (!ok) redirect("/media?error=not-found");

  // 5 — the folder is an admin-side filing detail; nothing public renders it.
  revalidatePath(`/media/${parsed.data.id}`); // 6
  redirect(`/media/${parsed.data.id}?saved=1`);
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

  // 3 + 4 — usage guard, S3 objects, row and audit all live in the shared op
  // so the explorer's delete button behaves identically to this one.
  const result = await deleteMediaById(id, session.user.id);
  if (!result.ok) {
    redirect(result.reason === "in-use" ? `/media/${id}?error=in-use` : "/media?error=not-found");
  }

  // 5 — nothing public referenced this media (guard above), so no site tags
  //     need invalidating.
  revalidatePath("/media"); // 6
  redirect("/media");
}
