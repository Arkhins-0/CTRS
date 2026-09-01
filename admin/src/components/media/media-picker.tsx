"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Folder,
  FolderPlus,
  ImageIcon,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { compressAll } from "./compress";
import { folderTrail, parentFolder } from "./folders";

/**
 * Reusable media picker — a small file explorer over the media library.
 *
 *  - <MediaPicker onSelect={(id, url, thumbUrl) => …} />  — a "Choose image"
 *    button that opens the explorer overlay.
 *  - <MediaPickerInput name="heroMediaId" initialId initialUrl />  — hidden
 *    input mode so any plain server-action <form> can carry an image field.
 *
 * The overlay browses folders, uploads into the folder you are looking at
 * and deletes files or empty folders, so an image can be added from wherever
 * it is needed without a detour to /media.
 *
 * IMPORTANT: this component is often rendered INSIDE a <form>, so every
 * interactive element here is type="button", the overlay contains no nested
 * <form>, and all writes go through JSON routes rather than server actions.
 */

export type PickerItem = {
  id: string;
  path: string;
  folder: string;
  filename: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  /** Public URL of the original object — what gets inserted into content. */
  url: string;
  /** Public URL of the 320w thumb — what pickers/previews should display. */
  thumbUrl: string;
};

type FolderEntry = { path: string; name: string; fileCount: number };

type Listing = {
  folder: string;
  folders: FolderEntry[];
  items: PickerItem[];
  hasMore: boolean;
  canManage: boolean;
};

type OnSelect = (mediaId: string, url: string, thumbUrl: string) => void;

const tileButton =
  "group relative overflow-hidden rounded-md border border-line bg-page text-left transition-colors hover:border-accent";

export function MediaPicker({
  onSelect,
  triggerLabel = "Choose image",
  triggerClassName,
  /** Folder the explorer opens in — a sensible default per call site. */
  defaultFolder = "",
}: {
  onSelect: OnSelect;
  triggerLabel?: string;
  triggerClassName?: string;
  defaultFolder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint"
        }
      >
        <ImageIcon size={14} /> {triggerLabel}
      </button>
      {open ? (
        <PickerOverlay
          defaultFolder={defaultFolder}
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
  defaultFolder,
}: {
  onClose: () => void;
  onPick: (item: PickerItem) => void;
  defaultFolder: string;
}) {
  const [folder, setFolder] = useState(defaultFolder);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PickerItem[]>([]);
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (query: string, dir: string, pageNum: number, append: boolean) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: query,
          folder: dir,
          page: String(pageNum),
        });
        const res = await fetch(`/api/media-list?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Media list failed (${res.status})`);
        const data = (await res.json()) as Listing;
        if (seq !== requestSeq.current) return; // a newer request superseded this one
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setFolders(data.folders);
        setCanManage(data.canManage);
        setHasMore(data.hasMore);
        setPage(pageNum);
      } catch (err) {
        if (seq === requestSeq.current) {
          setError(err instanceof Error ? err.message : "Could not load media.");
        }
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [],
  );

  // Initial load, folder changes and the debounced search all land here.
  useEffect(() => {
    const t = setTimeout(() => void load(q, folder, 1, false), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, folder, load]);

  const refresh = () => void load(q, folder, 1, false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy("Preparing images…");
    setError(null);
    try {
      const prepared = await compressAll(Array.from(files));
      setBusy(`Uploading ${prepared.length} file${prepared.length === 1 ? "" : "s"}…`);
      const body = new FormData();
      body.append("folder", folder);
      for (const f of prepared) body.append("files", f);
      const res = await fetch("/api/media-upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { items?: PickerItem[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`);
      // Newest first, matching the server's ordering.
      setItems((prev) => [...(data.items ?? []), ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const newFolder = async () => {
    const name = window.prompt("New folder name");
    if (!name?.trim()) return;
    setBusy("Creating folder…");
    setError(null);
    try {
      const path = folder ? `${folder}/${name}` : name;
      const res = await fetch("/api/media-folder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create the folder.");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the folder.");
    } finally {
      setBusy(null);
    }
  };

  const removeFolder = async (entry: FolderEntry) => {
    if (!window.confirm(`Delete the folder “${entry.name}”? It must be empty.`)) return;
    setBusy("Deleting folder…");
    setError(null);
    try {
      const res = await fetch("/api/media-folder", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: entry.path }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete the folder.");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the folder.");
    } finally {
      setBusy(null);
    }
  };

  const removeItem = async (item: PickerItem) => {
    if (!window.confirm(`Delete “${item.filename}” permanently?`)) return;
    setBusy("Deleting file…");
    setError(null);
    try {
      const res = await fetch("/api/media-item", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete the file.");
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the file.");
    } finally {
      setBusy(null);
    }
  };

  const trail = folderTrail(folder);
  const searching = q.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 sm:p-10"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-md border border-line bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <h2 className="text-sm font-black uppercase tracking-wide">Media library</h2>
          <div className="relative ml-auto w-56">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the whole library…"
              autoFocus
              className="w-full rounded-md border border-line bg-surface py-1.5 pl-8 pr-2 text-sm outline-none focus:border-accent"
            />
          </div>
          {canManage ? (
            <>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => void upload(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-accent-fg transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                <Upload size={14} /> Upload
              </button>
              <button
                type="button"
                onClick={() => void newFolder()}
                disabled={busy !== null || searching}
                title={searching ? "Clear the search to create a folder" : undefined}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors hover:border-fg-faint disabled:opacity-50"
              >
                <FolderPlus size={14} /> Folder
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-fg-muted transition-colors hover:text-f1-red"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Breadcrumb ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-1 border-b border-line px-4 py-2 text-xs">
          {searching ? (
            <span className="font-bold uppercase tracking-wide text-fg-muted">
              Search results across every folder
            </span>
          ) : (
            trail.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight size={12} className="text-fg-faint" /> : null}
                <button
                  type="button"
                  onClick={() => setFolder(crumb.path)}
                  disabled={crumb.path === folder}
                  className={`rounded-sm px-1.5 py-0.5 font-bold uppercase tracking-wide transition-colors ${
                    crumb.path === folder
                      ? "text-fg"
                      : "text-fg-muted hover:bg-panel hover:text-fg"
                  }`}
                >
                  {crumb.name}
                </button>
              </span>
            ))
          )}
          {busy ? (
            <span className="ml-auto flex items-center gap-1.5 font-semibold text-fg-muted">
              <Loader2 size={12} className="animate-spin" /> {busy}
            </span>
          ) : null}
        </div>

        {/* ── Contents ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="mb-3 rounded-md border border-f1-red bg-surface p-3 text-sm font-bold text-f1-red">
              {error}
            </p>
          ) : null}

          {!error && !loading && items.length === 0 && folders.length === 0 ? (
            <p className="p-6 text-center text-sm text-fg-muted">
              {searching
                ? `No media found for “${q}”.`
                : canManage
                  ? "This folder is empty — upload images or create a subfolder."
                  : "This folder is empty."}
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {/* Up one level */}
            {!searching && folder ? (
              <button
                type="button"
                onClick={() => setFolder(parentFolder(folder))}
                className={`${tileButton} flex aspect-4/3 flex-col items-center justify-center gap-1 text-fg-muted`}
              >
                <Folder size={22} />
                <span className="text-[11px] font-bold uppercase tracking-wide">Up one level</span>
              </button>
            ) : null}

            {folders.map((f) => (
              <div key={f.path} className={`${tileButton} flex flex-col`}>
                <button
                  type="button"
                  onClick={() => setFolder(f.path)}
                  className="flex aspect-4/3 w-full flex-col items-center justify-center gap-1 px-2"
                >
                  <Folder size={26} className="text-accent-ink" />
                  <span className="w-full truncate text-center text-[11px] font-bold text-fg">
                    {f.name}
                  </span>
                  <span className="text-[10px] text-fg-faint">
                    {f.fileCount} file{f.fileCount === 1 ? "" : "s"}
                  </span>
                </button>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => void removeFolder(f)}
                    aria-label={`Delete folder ${f.name}`}
                    className="absolute right-1 top-1 hidden rounded-sm bg-surface/90 p-1 text-fg-muted transition-colors hover:text-f1-red group-hover:block"
                  >
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </div>
            ))}

            {items.map((item) => (
              <div key={item.id} className={`${tileButton} flex flex-col`}>
                <button
                  type="button"
                  onClick={() => onPick(item)}
                  title={item.filename}
                  className="w-full text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbUrl}
                    alt={item.alt ?? item.filename}
                    loading="lazy"
                    className="aspect-4/3 w-full bg-panel object-cover"
                  />
                  <span className="block truncate px-1.5 py-1 text-[11px] text-fg-muted group-hover:text-fg">
                    {item.filename}
                  </span>
                </button>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => void removeItem(item)}
                    aria-label={`Delete ${item.filename}`}
                    className="absolute right-1 top-1 hidden rounded-sm bg-surface/90 p-1 text-fg-muted transition-colors hover:text-f1-red group-hover:block"
                  >
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </div>
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
                onClick={() => void load(q, folder, page + 1, true)}
                className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold uppercase tracking-wide hover:border-fg-faint"
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
  defaultFolder = "",
}: {
  name: string;
  initialId?: string | null;
  initialUrl?: string | null;
  label?: string;
  /** Folder the picker opens in / uploads into from this field. */
  defaultFolder?: string;
}) {
  const [selected, setSelected] = useState<{ id: string; url: string } | null>(
    initialId ? { id: initialId, url: initialUrl ?? "" } : null,
  );

  return (
    <div>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected ? (
        <div className="mb-2 rounded-md border border-line bg-page p-1">
          {selected.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.url}
              alt=""
              /* object-CONTAIN on a panel ground: previews must show the
                 whole asset — cover was cropping wide logo art to a strip. */
              className="max-h-48 w-full rounded-sm bg-panel object-contain p-2"
            />
          ) : (
            <p className="p-3 text-center text-xs text-fg-muted">Image selected</p>
          )}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <MediaPicker
          triggerLabel={selected ? "Replace" : label}
          defaultFolder={defaultFolder}
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
