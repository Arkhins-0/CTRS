/**
 * Server-side media-library operations shared by the /media pages and the
 * JSON routes the picker talks to, so browsing, uploading, deleting and
 * folder management behave identically wherever they are invoked.
 *
 * Server-only — pulls in the db pool, the S3 client and (transitively)
 * sharp, so never import this from a client component.
 */
import { and, asc, count, desc, eq, ilike, like, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, media, mediaFolders } from "@ctr/db";
import { findMediaUsage, type MediaUsage } from "@/app/(dashboard)/media/usage";
import { writeAudit } from "@/lib/audit";
import { deleteObject, publicUrl } from "@/lib/storage";
import { isDescendantFolder, normalizeFolder, parentFolder } from "@/components/media/folders";
import { processAndStoreImage } from "@/components/media/process-image";
import { emailVariantKey, MEDIA_VARIANTS, variantKey } from "@/components/media/variants";

export const MEDIA_PER_PAGE = 40;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // per file

export type MediaItem = {
  id: string;
  path: string;
  folder: string;
  filename: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  /** Public URL of the original object — what gets inserted into content. */
  url: string;
  /** Public URL of the 320w thumb — what pickers/previews display. */
  thumbUrl: string;
};

export type FolderEntry = { path: string; name: string; fileCount: number };

export type FolderListing = {
  folder: string;
  folders: FolderEntry[];
  items: MediaItem[];
  hasMore: boolean;
};

function toItem(row: {
  id: string;
  path: string;
  folder: string;
  filename: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}): MediaItem {
  return {
    ...row,
    url: publicUrl(row.path),
    thumbUrl: publicUrl(variantKey(row.path, "thumb")),
  };
}

/**
 * One folder's contents: its immediate subfolders (with file counts) and the
 * images filed directly in it. A search query switches to library-wide mode —
 * people searching want the file, not the folder it happens to sit in — so
 * subfolders are omitted and every folder is scanned.
 */
export async function listFolder(opts: {
  folder?: string | null;
  q?: string | null;
  page?: number;
}): Promise<FolderListing> {
  const folder = normalizeFolder(opts.folder);
  const q = (opts.q ?? "").trim().slice(0, 200);
  const page = Math.max(1, opts.page ?? 1);

  // The picker is image-only — documents (declaration PDFs) have no thumbs.
  let where: SQL | undefined = eq(media.kind, "image");
  if (q) {
    where = and(where, or(ilike(media.filename, `%${q}%`), ilike(media.alt, `%${q}%`)));
  } else {
    where = and(where, eq(media.folder, folder));
  }

  // One extra row tells us hasMore without a second count query.
  const rowsPromise = db
    .select({
      id: media.id,
      path: media.path,
      folder: media.folder,
      filename: media.filename,
      alt: media.alt,
      width: media.width,
      height: media.height,
    })
    .from(media)
    .where(where)
    .orderBy(desc(media.createdAt))
    .limit(MEDIA_PER_PAGE + 1)
    .offset((page - 1) * MEDIA_PER_PAGE);

  // Immediate children only: everything under this prefix, minus the deeper
  // descendants (filtered in JS — cheaper than a LIKE that excludes slashes).
  const foldersPromise = q
    ? Promise.resolve([])
    : db
        .select({ path: mediaFolders.path })
        .from(mediaFolders)
        .where(folder ? like(mediaFolders.path, `${folder}/%`) : undefined)
        .orderBy(asc(mediaFolders.path));

  const [rows, folderRows] = await Promise.all([rowsPromise, foldersPromise]);

  const children = folderRows
    .map((f) => f.path)
    .filter((p) => parentFolder(p) === folder);

  // File counts per child folder, including files in nested subfolders — an
  // empty-looking folder that actually holds a deep tree would be a lie.
  const counts = await Promise.all(
    children.map(async (path) => {
      const [row] = await db
        .select({ n: count() })
        .from(media)
        .where(
          and(
            eq(media.kind, "image"),
            or(eq(media.folder, path), like(media.folder, `${path}/%`)),
          ),
        );
      return row?.n ?? 0;
    }),
  );

  return {
    folder,
    folders: children.map((path, i) => ({
      path,
      name: path.slice(path.lastIndexOf("/") + 1),
      fileCount: counts[i] ?? 0,
    })),
    items: rows.slice(0, MEDIA_PER_PAGE).map(toItem),
    hasMore: rows.length > MEDIA_PER_PAGE,
  };
}

const fileSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().regex(/^image\//),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

/**
 * Makes sure a folder (and each of its ancestors) has a row, so a folder a
 * picker was pointed at starts existing the moment something is filed in it
 * rather than being a path that only shows up in URLs.
 */
async function ensureFolderRows(folder: string, actorId: string): Promise<void> {
  if (!folder) return;
  const segments = folder.split("/");
  for (let i = 1; i <= segments.length; i += 1) {
    await db
      .insert(mediaFolders)
      .values({ path: segments.slice(0, i).join("/"), createdBy: actorId })
      .onConflictDoNothing();
  }
}

/** Processes and stores every valid image, returning the created rows. */
export async function uploadImages(opts: {
  files: File[];
  folder?: string | null;
  actorId: string;
}): Promise<{ items: MediaItem[]; rejected: number }> {
  const folder = normalizeFolder(opts.folder);
  const items: MediaItem[] = [];
  let rejected = 0;

  for (const file of opts.files) {
    const check = fileSchema.safeParse({ name: file.name, type: file.type, size: file.size });
    if (!check.success) {
      rejected += 1;
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const row = await processAndStoreImage({
      buffer,
      filename: file.name,
      uploadedBy: opts.actorId,
      folder,
    });

    await writeAudit({
      actorId: opts.actorId,
      action: "media.upload",
      entityType: "media",
      entityId: row.id,
      diff: {
        after: { path: row.path, folder: row.folder, filename: row.filename, sizeBytes: row.sizeBytes },
      },
    });
    items.push(toItem(row));
  }

  if (items.length) await ensureFolderRows(folder, opts.actorId);

  return { items, rejected };
}

export type DeleteMediaResult =
  | { ok: true }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "in-use"; usage: MediaUsage[] };

/** Deletes one image and every derived rendition. Refused while referenced. */
export async function deleteMediaById(id: string, actorId: string): Promise<DeleteMediaResult> {
  const [row] = await db.select().from(media).where(eq(media.id, id));
  if (!row) return { ok: false, reason: "not-found" };

  const usage = await findMediaUsage(id);
  if (usage.length > 0) return { ok: false, reason: "in-use", usage };

  // Objects first, tolerating individual misses: an S3 failure must not
  // leave a DB row pointing at nothing invisibly.
  await Promise.allSettled([
    deleteObject(row.path),
    deleteObject(emailVariantKey(row.path)),
    ...MEDIA_VARIANTS.map((v) => deleteObject(variantKey(row.path, v))),
  ]);
  await db.delete(media).where(eq(media.id, id));

  await writeAudit({
    actorId,
    action: "media.delete",
    entityType: "media",
    entityId: id,
    diff: { before: { path: row.path, folder: row.folder, filename: row.filename } },
  });

  return { ok: true };
}

export type CreateFolderResult =
  | { ok: true; path: string }
  | { ok: false; reason: "invalid" | "exists" };

/** Creates a folder (and is a no-op-with-error when one already exists). */
export async function createFolder(
  rawPath: string,
  actorId: string,
): Promise<CreateFolderResult> {
  const path = normalizeFolder(rawPath);
  if (!path) return { ok: false, reason: "invalid" };

  const [existing] = await db
    .select({ id: mediaFolders.id })
    .from(mediaFolders)
    .where(eq(mediaFolders.path, path));
  if (existing) return { ok: false, reason: "exists" };

  // Materialise every ancestor too, so a folder created deep still shows up
  // when browsing the levels above it.
  const segments = path.split("/");
  for (let i = 1; i <= segments.length; i += 1) {
    const sub = segments.slice(0, i).join("/");
    await db.insert(mediaFolders).values({ path: sub, createdBy: actorId }).onConflictDoNothing();
  }

  await writeAudit({
    actorId,
    action: "media.folder.create",
    entityType: "media_folder",
    entityId: path,
    diff: { after: { path } },
  });

  return { ok: true, path };
}

export type DeleteFolderResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "not-found" | "not-empty"; files?: number; folders?: number };

/**
 * Deletes a folder, but only when nothing lives in it — neither files nor
 * subfolders, at any depth. Recursive deletion is deliberately not offered:
 * media rows can be referenced by published content, and a cascade here
 * would be an invisible way to break the public site.
 */
export async function deleteFolder(rawPath: string, actorId: string): Promise<DeleteFolderResult> {
  const path = normalizeFolder(rawPath);
  if (!path) return { ok: false, reason: "invalid" };

  const [existing] = await db
    .select({ id: mediaFolders.id })
    .from(mediaFolders)
    .where(eq(mediaFolders.path, path));
  if (!existing) return { ok: false, reason: "not-found" };

  const [fileRow] = await db
    .select({ n: count() })
    .from(media)
    .where(or(eq(media.folder, path), like(media.folder, `${path}/%`)));
  const files = fileRow?.n ?? 0;

  const subRows = await db
    .select({ path: mediaFolders.path })
    .from(mediaFolders)
    .where(like(mediaFolders.path, `${path}/%`));
  const folders = subRows.filter((r) => isDescendantFolder(r.path, path)).length;

  if (files > 0 || folders > 0) return { ok: false, reason: "not-empty", files, folders };

  await db.delete(mediaFolders).where(eq(mediaFolders.path, path));
  await writeAudit({
    actorId,
    action: "media.folder.delete",
    entityType: "media_folder",
    entityId: path,
    diff: { before: { path } },
  });

  return { ok: true };
}

/** Every folder path, for the "move to folder" and upload-target selects. */
export async function allFolders(): Promise<string[]> {
  const rows = await db
    .select({ path: mediaFolders.path })
    .from(mediaFolders)
    .orderBy(asc(mediaFolders.path));
  return rows.map((r) => r.path);
}

/** Moves one image into another folder (S3 objects stay where they are). */
export async function moveMedia(id: string, rawFolder: string, actorId: string): Promise<boolean> {
  const folder = normalizeFolder(rawFolder);
  const [row] = await db.select({ folder: media.folder }).from(media).where(eq(media.id, id));
  if (!row) return false;

  await db.update(media).set({ folder }).where(eq(media.id, id));
  await writeAudit({
    actorId,
    action: "media.move",
    entityType: "media",
    entityId: id,
    diff: { before: { folder: row.folder }, after: { folder } },
  });
  return true;
}
