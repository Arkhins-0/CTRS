import Link from "next/link";
import { desc } from "drizzle-orm";
import { format } from "date-fns";
import { db, PERMISSIONS, videos } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, LinkButton, PageHeader, StatusPill, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function VideosListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission(PERMISSIONS.VIDEOS_MANAGE);
  const { error } = await searchParams;

  const rows = await db
    .select()
    .from(videos)
    .orderBy(desc(videos.createdAt))
    .limit(200);

  return (
    <>
      <PageHeader
        title="Videos"
        sub="YouTube embeds and uploaded video files"
        actions={<LinkButton href="/videos/new">New video</LinkButton>}
      />

      {error ? (
        <p className="mb-4 border border-f1-red bg-white p-3 text-sm font-bold text-f1-red">
          Something went wrong ({error}). Please try again.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="No videos yet" hint="Add the first video with “New video”." />
      ) : (
        <Table
          head={
            <>
              <th>Title</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Published</th>
            </>
          }
        >
          {rows.map((v) => (
            <tr key={v.id}>
              <td>
                <Link href={`/videos/${v.id}`} className="font-bold text-carbon hover:text-f1-red">
                  {v.title}
                </Link>
              </td>
              <td className="uppercase text-f1-grey">{v.provider}</td>
              <td>
                <StatusPill status={v.status} />
              </td>
              <td className="whitespace-nowrap text-f1-grey">
                {v.publishedAt ? format(v.publishedAt, "d MMM yyyy HH:mm") : "—"}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
