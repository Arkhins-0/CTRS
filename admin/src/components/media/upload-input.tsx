"use client";

import { useRef, useState } from "react";
import { compressAll, formatBytes } from "./compress";

/**
 * File input that compresses images in the browser before the form posts —
 * see compress.ts for why that is required rather than a nicety.
 *
 * Files that cannot be decoded (or that would not shrink) pass through
 * untouched; the server validates everything regardless.
 */
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
      const compressed = await compressAll(Array.from(input.files));
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
