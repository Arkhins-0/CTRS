/**
 * Browser-side image downscaling, shared by every upload entry point.
 *
 * Uploads travel in a single request, and those have hard body limits (Next's
 * serverActions.bodySizeLimit, and ~4.5 MB per request on Vercel functions).
 * A phone photo is routinely 3–8 MB, so raw uploads failed before the server
 * ever saw them. The server pipeline resizes every original to 2000px anyway,
 * so shrinking to the same bound here loses nothing it would have kept.
 *
 * Client-only: touches `document` and `createImageBitmap`.
 */

const MAX_EDGE = 2000; // matches the server pipeline's original cap
const COMPRESS_OVER_BYTES = 1_000_000; // leave already-small files alone

/** Downscales to WebP when worthwhile; returns the input unchanged otherwise. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // Animated GIFs would lose their frames; SVG is vector and already tiny.
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size <= COMPRESS_OVER_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    if (!blob || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^.]+$/, "")}.webp`;
    return new File([blob], name, { type: "image/webp", lastModified: file.lastModified });
  } catch {
    // undecodable format (HEIC on some browsers, etc.) — send as-is
    return file;
  }
}

export async function compressAll(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage));
}

export function formatBytes(n: number): string {
  return n >= 1_048_576
    ? `${(n / 1_048_576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;
}
