"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const toolbarBtn =
  "chamfer-tr border border-line bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Upload slot for the session's official result declaration — the signed
 * classification PDF on the championship letterhead ("office order"). The file
 * is stored in S3 via /api/session-declaration and published on the public
 * site next to the classification.
 */
export function DeclarationPanel({
  sessionId,
  current,
}: {
  sessionId: string;
  current: { url: string; filename: string; sizeBytes: number | null } | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("sessionId", sessionId);
      body.append("file", file);
      const res = await fetch("/api/session-declaration", { method: "POST", body });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed — try again.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove the official declaration PDF from this session?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/session-declaration", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Removal failed — try again.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Removal failed — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="chamfer-tr mt-6 border border-line bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-wide text-fg">
        Official declaration (PDF)
      </h2>
      <p className="mt-1 text-xs text-fg-muted">
        The signed classification on the championship letterhead — published on the site beside
        this session&apos;s results as the authentic final declaration.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {current ? (
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="chamfer-tr inline-flex items-center gap-2 border border-line bg-page px-3 py-1.5 text-xs font-bold text-fg transition-colors hover:border-f1-red hover:text-f1-red"
          >
            <span aria-hidden>📄</span>
            {current.filename}
            {current.sizeBytes ? (
              <span className="font-normal text-fg-muted">
                {Math.max(1, Math.round(current.sizeBytes / 1024))} KB
              </span>
            ) : null}
          </a>
        ) : (
          <span className="text-xs font-bold uppercase tracking-wide text-fg-muted">
            No declaration uploaded yet
          </span>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className={toolbarBtn}
        >
          {busy ? "Working…" : current ? "Replace PDF" : "Upload PDF"}
        </button>
        {current ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="chamfer-tr border border-f1-red bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-f1-red transition-colors hover:bg-f1-red hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove
          </button>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          aria-label="Upload the official declaration PDF"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>

      {error ? (
        <p className="chamfer-tr mt-3 border border-f1-red bg-surface px-3 py-2 text-xs font-bold text-f1-red">
          {error}
        </p>
      ) : null}
    </section>
  );
}
