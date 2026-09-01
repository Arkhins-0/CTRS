"use client";

import { useRef, useState } from "react";

/*
 * File input that compresses images IN THE BROWSER before the form posts.
 *
 * Why: uploads go through a server action, and the request has hard body
 * limits (Next's serverActions.bodySizeLimit, and ~4.5 MB per request on
 * Vercel functions). A phone photo is routinely 3–8 MB, so raw uploads died
 * before the action ran. The server pipeline resizes every original down to
 * 2000px anyway, so downscaling to 2000px WebP here loses nothing the
 * server would have kept — and turns an 8 MB camera JPEG into a few hundred
 * kilobytes.
 *
 * Files that can't be decoded (or that don't shrink) pass through untouched.
 */

const MAX_EDGE = 2000; // matches the server pipeline's original cap
const COMPRESS_OVER_BYTES = 1_000_000; // leave already-small files alone

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
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

function formatBytes(n: number): string {
  return n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

export function UploadInput({ name }: { name: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onChange = async () => {
    const input = inputRef.current;
    if (!input?.files?.length) {
      setStatus(null);
      return;
    }
    setBusy(true);
    setStatus("Preparing images…");
    try {
      const originals = Array.from(input.files);
      const compressed = await Promise.all(originals.map(compressImage));
      const dt = new DataTransfer();
      for (const f of compressed) dt.items.add(f);
      input.files = dt.files;
      const total = compressed.reduce((sum, f) => sum + f.size, 0);
      setStatus(
        `${compressed.length} file${compressed.length === 1 ? "" : "s"} ready · ${formatBytes(total)}`,
      );
    } catch {
      // leave the original selection in place — the server still validates
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        name={name}
        multiple
        required
        accept="image/*"
        disabled={busy}
        onChange={onChange}
        className="text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-line file:bg-page file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-wide disabled:opacity-60"
      />
      {status ? <span className="text-xs font-semibold text-fg-muted">{status}</span> : null}
    </span>
  );
}
