/**
 * Server-only image ingestion pipeline shared by the media library upload
 * action and the .docx import route. Never import this from a client
 * component (it pulls in sharp + the S3 client + the db pool).
 */
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db, media } from "@ctr/db";
import { putObject } from "@/lib/storage";
import { variantKey } from "./variants";

const VARIANT_WIDTHS = { hero: 1600, card: 800, thumb: 320 } as const;
const WEBP_QUALITY = 82;

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
  /** Max width of the stored "original" (default 2000; docx import uses 1600). */
  maxWidth?: number;
}): Promise<StoredImage> {
  const maxWidth = opts.maxWidth ?? 2000;

  // Original rendition — .rotate() honours EXIF orientation; sharp strips
  // metadata unless .withMetadata() is called, so EXIF/GPS never reach S3.
  const { data: original, info } = await sharp(opts.buffer)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const key = `media/${yyyy}/${mm}/${randomUUID()}.webp`;

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

  const [row] = await db
    .insert(media)
    .values({
      kind: "image",
      path: key,
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
