import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articleTags, db, TAGS, tags } from "@ctr/db";
import { ArticleGrid, NewsEmpty } from "@/components/news/article-card";
import { NewsHubBand } from "@/components/news/article-hub";
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
    description: `Every CTR story tagged ${archive.tag.name}.`,
  };
}

export default async function TagArchivePage({ params }: Props) {
  const { tagSlug } = await params;
  const archive = await getTagArchive(tagSlug);
  if (!archive) notFound();

  const { tag, rows } = archive;

  return (
    <NewsHubBand
      kicker="Tagged"
      title={tag.name}
      note={rows.length ? `${rows.length} ${rows.length === 1 ? "story" : "stories"}` : null}
    >
      {rows.length ? (
        <ArticleGrid articles={rows} />
      ) : (
        <NewsEmpty>No published stories carry this tag yet.</NewsEmpty>
      )}
    </NewsHubBand>
  );
}
