import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articleTags, db, TAGS, tags } from "@ctr/db";
import { ArticleCard } from "@/components/news/article-card";
import { cached } from "@/lib/cache";

type Props = { params: Promise<{ tagSlug: string }> };

function getTagArchive(slug: string) {
  return cached(
    async () => {
      const tag = await db.query.tags.findFirst({ where: eq(tags.slug, slug) });
      if (!tag) return null;

      const links = await db.query.articleTags.findMany({
        where: eq(articleTags.tagId, tag.id),
        with: { article: { with: { hero: true, category: true } } },
      });

      const rows = links
        .map((l) => l.article)
        .filter((a) => a.status === "published")
        .sort(
          (a, b) =>
            new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime(),
        );

      return { tag, rows };
    },
    ["tag-archive", slug],
    [TAGS.articles],
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tagSlug } = await params;
  const archive = await getTagArchive(tagSlug);
  if (!archive) return { title: "Tag not found" };
  return {
    title: `${archive.tag.name} — News`,
    description: `Every CTR Sports story tagged ${archive.tag.name}.`,
  };
}

export default async function TagArchivePage({ params }: Props) {
  const { tagSlug } = await params;
  const archive = await getTagArchive(tagSlug);
  if (!archive) notFound();

  const { tag, rows } = archive;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">Tagged</p>
      <h1 className="mt-1 border-l-4 border-accent pl-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
        {tag.name}
      </h1>
      <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">
        {rows.length} {rows.length === 1 ? "story" : "stories"}
      </p>

      {rows.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-center text-sm font-semibold uppercase tracking-wide text-fg-faint">
          No published stories carry this tag yet.
        </p>
      )}
    </main>
  );
}
