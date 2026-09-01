/**
 * Server-only image ingestion pipeline shared by the media library upload
 * action and the .docx import route. Never import this from a client
 * component (it pulls in sharp + the S3 client + the db pool).
 */
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db, media } from "@ctr/db";
import { putObject } from "@/lib/storage";
import { normalizeFolder } from "./folders";
import { emailVariantKey, variantKey } from "./variants";

const VARIANT_WIDTHS = { hero: 1600, card: 800, thumb: 320 } as const;
const WEBP_QUALITY = 82;
/** Matches the "card" tier — the size every email template actually uses. */
const EMAIL_VARIANT_WIDTH = 800;

export type StoredImage = typeof media.$inferSelect;

/**
 * Auto-rotates (EXIF), strips metadata (sharp default), converts to webp,
 * writes the original + 3 variants to S3 and inserts ONE media row.
 * The caller is responsible for the audit entry.
 */
export async function processAndStoreImage(opts: {
  buffer: Buffer;
  filename: string;
  uploadedBy: string | null;
  credit?: string | null;
  /** Library folder ("" = root). Mirrored into the S3 key. */
  folder?: string | null;
  /** Max width of the stored "original" (default 2000; docx import uses 1600). */
  maxWidth?: number;
}): Promise<StoredImage> {
  const maxWidth = opts.maxWidth ?? 2000;
  const folder = normalizeFolder(opts.folder);

  // Original rendition — .rotate() honours EXIF orientation; sharp strips
  // metadata unless .withMetadata() is called, so EXIF/GPS never reach S3.
  const { data: original, info } = await sharp(opts.buffer)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });

  /*
   * The object key mirrors the library folder, so the bucket browses the
   * same way the admin explorer does. Files at the root keep the original
   * year/month partition — dumping every unfiled upload into one flat
   * prefix makes the bucket unusable at scale.
   */
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const prefix = folder ? `media/${folder}` : `media/${yyyy}/${mm}`;
  const key = `${prefix}/${randomUUID()}.webp`;

  await putObject(key, original, "image/webp");

  for (const [variant, width] of Object.entries(VARIANT_WIDTHS) as [
    keyof typeof VARIANT_WIDTHS,
    number,
  ][]) {
    const rendition = await sharp(opts.buffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    await putObject(variantKey(key, variant), rendition, "image/webp");
  }

  // Fourth rendition: PNG, for email only — see variants.ts. Same source
  // buffer, same EXIF-rotate, resized to the "card" tier since that's the
  // only size any email template asks for.
  const emailRendition = await sharp(opts.buffer)
    .rotate()
    .resize({ width: EMAIL_VARIANT_WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await putObject(emailVariantKey(key), emailRendition, "image/png");

  const [row] = await db
    .insert(media)
    .values({
      kind: "image",
      path: key,
      folder,
      filename: opts.filename.slice(0, 255),
      mime: "image/webp",
      width: info.width,
      height: info.height,
      sizeBytes: original.length,
      credit: opts.credit ?? null,
      uploadedBy: opts.uploadedBy,
    })
    .returning();

  return row;
}
