import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db, galleries, galleryItems, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, LinkButton, PageHeader, StatusPill, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function GalleriesListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission(PERMISSIONS.VIDEOS_MANAGE);
  const { error } = await searchParams;

  const rows = await db
    .select({
      id: galleries.id,
      title: galleries.title,
      slug: galleries.slug,
      status: galleries.status,
      publishedAt: galleries.publishedAt,
      createdAt: galleries.createdAt,
      itemCount: count(galleryItems.mediaId),
    })
    .from(galleries)
    .leftJoin(galleryItems, eq(galleryItems.galleryId, galleries.id))
    .groupBy(galleries.id)
    .orderBy(desc(galleries.createdAt))
    .limit(200);

  return (
    <>
      <PageHeader
        title="Galleries"
        sub="Curated image sets for the public site"
        actions={<LinkButton href="/galleries/new">New gallery</LinkButton>}
      />

      {error ? (
        <p className="mb-4 border border-f1-red bg-surface p-3 text-sm font-bold text-f1-red">
          Something went wrong ({error}). Please try again.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="No galleries yet" hint="Create the first gallery, then add images from the media library." />
      ) : (
        <Table
          head={
            <>
              <th>Title</th>
              <th>Images</th>
              <th>Status</th>
              <th>Published</th>
            </>
          }
        >
          {rows.map((g) => (
            <tr key={g.id}>
              <td>
                <Link href={`/galleries/${g.id}`} className="font-bold text-fg hover:text-f1-red">
                  {g.title}
                </Link>
              </td>
              <td className="text-fg-muted">{g.itemCount}</td>
              <td>
                <StatusPill status={g.status} />
              </td>
              <td className="whitespace-nowrap text-fg-muted">
                {g.publishedAt ? format(g.publishedAt, "d MMM yyyy HH:mm") : "—"}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
