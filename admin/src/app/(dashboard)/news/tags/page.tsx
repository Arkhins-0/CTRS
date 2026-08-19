import { count } from "drizzle-orm";
import { articleTags, db, PERMISSIONS, tags, videoTags } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, EmptyState, Input, LinkButton, PageHeader, Table } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { createTagAction, deleteTagAction, updateTagAction } from "./actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid: "Invalid input — a name is required.",
  "slug-taken": "That slug is already in use.",
  "not-found": "Tag not found.",
};

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission(PERMISSIONS.NEWS_MANAGE);
  const { error } = await searchParams;

  const [allTags, articleCounts, videoCounts] = await Promise.all([
    db.select().from(tags).orderBy(tags.name),
    db
      .select({ tagId: articleTags.tagId, n: count() })
      .from(articleTags)
      .groupBy(articleTags.tagId),
    db.select({ tagId: videoTags.tagId, n: count() }).from(videoTags).groupBy(videoTags.tagId),
  ]);
  const byArticle = new Map(articleCounts.map((c) => [c.tagId, c.n]));
  const byVideo = new Map(videoCounts.map((c) => [c.tagId, c.n]));

  return (
    <>
      <PageHeader
        title="Tags"
        sub="Deleting a tag only removes its links to articles and videos"
        actions={<LinkButton variant="ghost" href="/news">← Back to news</LinkButton>}
      />

      {error ? (
        <p className="mb-4 border border-f1-red bg-white p-3 text-sm font-bold text-f1-red">
          {ERRORS[error] ?? "Something went wrong."}
        </p>
      ) : null}

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Add tag</h2>
        <form action={createTagAction} className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Input name="name" placeholder="Name" required maxLength={120} />
          </div>
          <div className="w-56">
            <Input name="slug" placeholder="Slug (auto from name)" maxLength={120} />
          </div>
          <SubmitButton>Add</SubmitButton>
        </form>
      </Card>

      {allTags.length === 0 ? (
        <EmptyState title="No tags yet" hint="Add the first tag above — or create one from the article editor." />
      ) : (
        <Table
          head={
            <>
              <th>Name</th>
              <th>Slug</th>
              <th>Used by</th>
              <th className="w-24" />
            </>
          }
        >
          {allTags.map((t) => {
            const nArticles = byArticle.get(t.id) ?? 0;
            const nVideos = byVideo.get(t.id) ?? 0;
            return (
              <tr key={t.id}>
                <td colSpan={3}>
                  <form action={updateTagAction} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="id" value={t.id} />
                    <div className="w-56">
                      <Input name="name" defaultValue={t.name} required maxLength={120} />
                    </div>
                    <div className="w-56">
                      <Input name="slug" defaultValue={t.slug} maxLength={120} className="font-mono" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wide text-f1-grey">
                      {nArticles} article{nArticles === 1 ? "" : "s"} · {nVideos} video
                      {nVideos === 1 ? "" : "s"}
                    </span>
                    <SubmitButton variant="secondary" className="!px-3 !py-1.5 !text-xs">
                      Save
                    </SubmitButton>
                  </form>
                </td>
                <td className="text-right">
                  <form action={deleteTagAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmSubmit
                      message={`Delete tag “${t.name}”? It will be removed from ${nArticles + nVideos} item(s).`}
                    >
                      Delete
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
