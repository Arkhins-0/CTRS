import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { format } from "date-fns";
import { db, media, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { Button, Card, EmptyState, Input, LinkButton, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { uploadMediaAction } from "./actions";

export const dynamic = "force-dynamic";

const PER_PAGE = 40;

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.MEDIA_MANAGE);
  const { q = "", page: pageParam, error } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  // the library grid renders image thumbnails — documents (declaration PDFs)
  // are managed from their owning pages, not listed here
  let where: SQL | undefined = eq(media.kind, "image");
  const query = q.trim();
  if (query) {
    where = and(where, or(ilike(media.filename, `%${query}%`), ilike(media.alt, `%${query}%`)));
  }

  const [rows, totals] = await Promise.all([
    db.query.media.findMany({
      where,
      with: { uploader: true },
      orderBy: [desc(media.createdAt)],
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
    }),
    db.select({ n: count() }).from(media).where(where),
  ]);
  const total = totals[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const pageHref = (p: number) =>
    `/media?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Media Library" sub={`${total} file${total === 1 ? "" : "s"} in the library`} />

      {error === "no-valid-files" ? (
        <p className="mb-4 border border-f1-red bg-white p-3 text-sm font-bold text-f1-red">
          No valid image files were uploaded — only image files up to 25 MB are accepted.
        </p>
      ) : null}

      <Card className="mb-6">
        <h2 className="text-sm font-black uppercase tracking-wide">Upload images</h2>
        <p className="mt-1 text-xs text-f1-grey">
          Images are converted to webp, stripped of metadata and stored with hero / card / thumb
          renditions.
        </p>
        <form action={uploadMediaAction} className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="files"
            multiple
            required
            accept="image/*"
            className="text-sm file:mr-3 file:cursor-pointer file:border file:border-warm-grey file:bg-off-white file:px-3 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-wide"
          />
          <SubmitButton>Upload</SubmitButton>
        </form>
      </Card>

      <form method="GET" action="/media" className="mb-4 flex max-w-md items-center gap-2">
        <Input type="search" name="q" defaultValue={query} placeholder="Search filename or alt text…" />
        <Button variant="ghost">Search</Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={query ? `No media matches “${query}”` : "The media library is empty"}
          hint="Upload images with the form above."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map((m) => (
            <Link
              key={m.id}
              href={`/media/${m.id}`}
              className="chamfer-tr group border border-warm-grey bg-white shadow-sm transition-colors hover:border-f1-red"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicUrl(variantKey(m.path, "thumb"))}
                alt={m.alt ?? m.filename}
                loading="lazy"
                className="aspect-[4/3] w-full bg-off-white object-cover"
              />
              <div className="p-2.5">
                <p className="truncate text-xs font-bold text-carbon group-hover:text-f1-red">
                  {m.filename}
                </p>
                <p className="mt-0.5 text-[11px] text-f1-grey">
                  {m.width && m.height ? `${m.width}×${m.height}` : "—"}
                  {" · "}
                  {m.sizeBytes ? `${Math.max(1, Math.round(m.sizeBytes / 1024))} KB` : "—"}
                </p>
                <p className="truncate text-[11px] text-f1-grey-light">
                  {m.uploader?.displayName ?? "—"} · {format(m.createdAt, "d MMM yyyy")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          {page > 1 ? (
            <LinkButton variant="ghost" href={pageHref(page - 1)}>
              ← Previous
            </LinkButton>
          ) : null}
          <span className="text-xs font-bold uppercase tracking-wide text-f1-grey">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <LinkButton variant="ghost" href={pageHref(page + 1)}>
              Next →
            </LinkButton>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
