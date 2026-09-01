import Link from "next/link";
import { ChevronRight, Folder, FolderPlus, Trash2 } from "lucide-react";
import { PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { listFolder } from "@/lib/media-ops";
import { folderTrail, normalizeFolder, parentFolder } from "@/components/media/folders";
import { UploadInput } from "@/components/media/upload-input";
import { Button, Card, EmptyState, Input, LinkButton, PageHeader } from "@/components/ui";
import { ConfirmIconSubmit, SubmitButton } from "@/components/ui-client";
import { createFolderAction, deleteFolderAction, uploadMediaAction } from "./actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "no-valid-files": "No valid image files were uploaded — images only, up to 25 MB each.",
  "folder-exists": "A folder with that name already exists here.",
  "folder-invalid": "Folder names need at least one letter or number.",
  "folder-not-empty": "That folder still holds files or subfolders — empty it first.",
  "folder-not-found": "That folder no longer exists.",
  invalid: "That request wasn’t valid.",
  "not-found": "That file no longer exists.",
};

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; error?: string; folder?: string }>;
}) {
  await requirePermission(PERMISSIONS.MEDIA_MANAGE);
  const { q = "", page: pageParam, error, folder: folderParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const query = q.trim();
  const folder = normalizeFolder(folderParam);

  const { folders, items, hasMore } = await listFolder({ folder, q: query, page });
  const searching = query.length > 0;
  const trail = folderTrail(folder);

  const hrefFor = (opts: { folder?: string; page?: number; q?: string }) => {
    const params = new URLSearchParams();
    const f = opts.folder ?? folder;
    const term = opts.q ?? query;
    if (f) params.set("folder", f);
    if (term) params.set("q", term);
    if (opts.page && opts.page > 1) params.set("page", String(opts.page));
    const qs = params.toString();
    return qs ? `/media?${qs}` : "/media";
  };

  return (
    <>
      <PageHeader
        title="Media Library"
        sub={
          searching
            ? `Searching every folder for “${query}”`
            : folder
              ? `/${folder}`
              : "Browse folders, upload images and manage files"
        }
      />

      {error && ERRORS[error] ? (
        <p className="mb-4 rounded-md border border-f1-red bg-surface p-3 text-sm font-bold text-f1-red">
          {ERRORS[error]}
        </p>
      ) : null}

      {/* ── Upload + new folder, both scoped to the folder being viewed ── */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <h2 className="text-sm font-black uppercase tracking-wide">
            Upload to {folder ? `/${folder}` : "the library root"}
          </h2>
          <p className="mt-1 text-xs text-fg-muted">
            Large images are compressed in your browser first, then converted to webp, stripped of
            metadata and stored with hero / card / thumb renditions.
          </p>
          <form action={uploadMediaAction} className="mt-3 flex flex-wrap items-center gap-3">
            <input type="hidden" name="folder" value={folder} />
            <UploadInput name="files" />
            <SubmitButton>Upload</SubmitButton>
          </form>
        </Card>

        <Card>
          <h2 className="text-sm font-black uppercase tracking-wide">New folder</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Created inside {folder ? `/${folder}` : "the library root"}. Names become lower-case
            and dashed.
          </p>
          <form action={createFolderAction} className="mt-3 flex flex-wrap items-center gap-2">
            <input type="hidden" name="parent" value={folder} />
            <Input
              name="name"
              required
              maxLength={60}
              placeholder="drivers"
              className="min-w-40 flex-1"
            />
            <SubmitButton>
              <FolderPlus size={14} /> Create
            </SubmitButton>
          </form>
        </Card>
      </div>

      {/* ── Breadcrumb + search ─────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs">
          {trail.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 ? <ChevronRight size={12} className="text-fg-faint" /> : null}
              {crumb.path === folder && !searching ? (
                <span className="px-1.5 py-0.5 font-bold uppercase tracking-wide text-fg">
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={hrefFor({ folder: crumb.path, q: "", page: 1 })}
                  className="rounded-sm px-1.5 py-0.5 font-bold uppercase tracking-wide text-fg-muted transition-colors hover:bg-panel hover:text-fg"
                >
                  {crumb.name}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <form method="GET" action="/media" className="ml-auto flex items-center gap-2">
          {folder ? <input type="hidden" name="folder" value={folder} /> : null}
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search every folder…"
            className="w-56"
          />
          <Button variant="ghost">Search</Button>
          {searching ? (
            <LinkButton href={hrefFor({ q: "", page: 1 })} variant="ghost">
              Clear
            </LinkButton>
          ) : null}
        </form>
      </div>

      {/* ── Folders ─────────────────────────────────────────────────────── */}
      {!searching && (folders.length > 0 || folder) ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {folder ? (
            <Link
              href={hrefFor({ folder: parentFolder(folder), page: 1 })}
              className="flex items-center gap-2.5 rounded-md border border-line bg-surface p-3 text-fg-muted transition-colors hover:border-accent hover:text-fg"
            >
              <Folder size={18} />
              <span className="text-xs font-bold uppercase tracking-wide">Up one level</span>
            </Link>
          ) : null}
          {folders.map((f) => (
            <div
              key={f.path}
              className="flex items-center gap-2.5 rounded-md border border-line bg-surface p-3 transition-colors hover:border-accent"
            >
              <Folder size={18} className="shrink-0 text-accent-ink" />
              <Link href={hrefFor({ folder: f.path, page: 1 })} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-fg">{f.name}</span>
                <span className="text-[11px] text-fg-faint">
                  {f.fileCount} file{f.fileCount === 1 ? "" : "s"}
                </span>
              </Link>
              <form action={deleteFolderAction} className="shrink-0">
                <input type="hidden" name="path" value={f.path} />
                <ConfirmIconSubmit
                  label={`Delete folder ${f.name}`}
                  message={`Delete the folder “${f.name}”? It must be empty.`}
                >
                  <Trash2 size={14} />
                </ConfirmIconSubmit>
              </form>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Files ───────────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <EmptyState
          title={
            searching
              ? `No media matches “${query}”`
              : folder
                ? "This folder has no images yet"
                : "The library root has no images yet"
          }
          hint="Upload images with the form above."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((m) => (
            <Link
              key={m.id}
              href={`/media/${m.id}`}
              className="group overflow-hidden rounded-md border border-line bg-surface shadow-sm transition-colors hover:border-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.thumbUrl}
                alt={m.alt ?? m.filename}
                loading="lazy"
                className="aspect-4/3 w-full bg-panel object-cover"
              />
              <div className="p-2.5">
                <p className="truncate text-xs font-bold text-fg">{m.filename}</p>
                <p className="mt-0.5 text-[11px] text-fg-muted">
                  {m.width && m.height ? `${m.width}×${m.height}` : "—"}
                  {searching && m.folder ? ` · /${m.folder}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {items.length > 0 && (hasMore || page > 1) ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          {page > 1 ? (
            <LinkButton variant="ghost" href={hrefFor({ page: page - 1 })}>
              ← Previous
            </LinkButton>
          ) : null}
          <span className="text-xs font-bold uppercase tracking-wide text-fg-muted">
            Page {page}
          </span>
          {hasMore ? (
            <LinkButton variant="ghost" href={hrefFor({ page: page + 1 })}>
              Next →
            </LinkButton>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
