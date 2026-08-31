"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Search, X } from "lucide-react";

/**
 * Reusable media picker.
 *
 *  - <MediaPicker onSelect={(id, url, thumbUrl) => …} />  — a "Choose image"
 *    button that opens an overlay backed by /api/media-list.
 *  - <MediaPickerInput name="heroMediaId" initialId initialUrl />  — hidden
 *    input mode so any plain server-action <form> can carry an image field.
 *
 * IMPORTANT: this component is often rendered INSIDE a <form>, so every
 * interactive element here is type="button" and the overlay contains no
 * nested <form>.
 */

export type PickerItem = {
  id: string;
  path: string;
  filename: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  /** Public URL of the original object — what gets inserted into content. */
  url: string;
  /** Public URL of the 320w thumb — what pickers/previews should display. */
  thumbUrl: string;
};

type OnSelect = (mediaId: string, url: string, thumbUrl: string) => void;

export function MediaPicker({
  onSelect,
  triggerLabel = "Choose image",
  triggerClassName,
}: {
  onSelect: OnSelect;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "chamfer-tr inline-flex items-center gap-2 border border-line bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint"
        }
      >
        <ImageIcon size={14} /> {triggerLabel}
      </button>
      {open ? (
        <PickerOverlay
          onClose={() => setOpen(false)}
          onPick={(item) => {
            onSelect(item.id, item.url, item.thumbUrl);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function PickerOverlay({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (item: PickerItem) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PickerItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const load = useCallback(async (query: string, pageNum: number, append: boolean) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/media-list?q=${encodeURIComponent(query)}&page=${pageNum}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Media list failed (${res.status})`);
      const data = (await res.json()) as { items: PickerItem[]; hasMore: boolean };
      if (seq !== requestSeq.current) return; // a newer request superseded this one
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      if (seq === requestSeq.current) {
        setError(err instanceof Error ? err.message : "Could not load media.");
      }
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  // Initial load + debounced search.
  useEffect(() => {
    const t = setTimeout(() => void load(q, 1, false), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-panel/70 p-4 sm:p-10"
      onClick={onClose}
    >
      <div
        className="chamfer-tr flex max-h-[85vh] w-full max-w-3xl flex-col border border-line bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line p-4">
          <h2 className="text-sm font-black uppercase tracking-wide">Media library</h2>
          <div className="relative ml-auto w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search filename or alt text…"
              autoFocus
              className="w-full border border-line bg-surface py-1.5 pl-8 pr-2 text-sm outline-none focus:border-f1-red"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-fg-muted transition-colors hover:text-f1-red"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="border border-f1-red bg-surface p-3 text-sm font-bold text-f1-red">{error}</p>
          ) : null}

          {!error && items.length === 0 && !loading ? (
            <p className="p-6 text-center text-sm text-fg-muted">
              No media found{q ? ` for “${q}”` : ""}.
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item)}
                title={item.filename}
                className="group border border-line bg-page text-left transition-colors hover:border-f1-red"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbUrl}
                  alt={item.alt ?? item.filename}
                  loading="lazy"
                  className="aspect-4/3 w-full object-cover"
                />
                <span className="block truncate px-1.5 py-1 text-[11px] text-fg-muted group-hover:text-fg">
                  {item.filename}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <p className="flex items-center justify-center gap-2 p-4 text-sm text-fg-muted">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </p>
          ) : null}

          {hasMore && !loading ? (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => void load(q, page + 1, true)}
                className="chamfer-tr border border-line bg-surface px-4 py-2 text-xs font-bold uppercase tracking-wide hover:border-fg-faint"
              >
                Load more
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Hidden-input mode: renders <input type="hidden" name={name} value={id} />
 * plus a preview thumbnail, replace and clear buttons — drop it into any
 * server-action form to add an image field.
 */
export function MediaPickerInput({
  name,
  initialId,
  initialUrl,
  label = "Choose image",
}: {
  name: string;
  initialId?: string | null;
  initialUrl?: string | null;
  label?: string;
}) {
  const [selected, setSelected] = useState<{ id: string; url: string } | null>(
    initialId ? { id: initialId, url: initialUrl ?? "" } : null,
  );

  return (
    <div>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected ? (
        <div className="mb-2 border border-line bg-page p-1">
          {selected.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.url} alt="" className="max-h-40 w-full object-cover" />
          ) : (
            <p className="p-3 text-center text-xs text-fg-muted">Image selected</p>
          )}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <MediaPicker
          triggerLabel={selected ? "Replace" : label}
          onSelect={(id, _url, thumbUrl) => setSelected({ id, url: thumbUrl })}
        />
        {selected ? (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-fg-muted transition-colors hover:text-f1-red"
          >
            <X size={12} /> Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
