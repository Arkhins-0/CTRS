import { format } from "date-fns";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { articleRelated, articles, db, TAGS } from "@ctr/db";
import { ArticleBody } from "@/components/news/article-body";
import { ArticleGrid, Tag } from "@/components/news/article-card";
import { SaveArticleButton } from "@/components/news/save-article-button";
import { cached } from "@/lib/cache";
import { mediaUrl } from "@/lib/media";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;

export async function generateStaticParams() {
  const rows = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
    .limit(50);
  return rows.map((r) => ({ slug: r.slug }));
}

/* ── Cached article + related bundle ─────────────────────────────────────── */

function getArticleBundle(slug: string) {
  return cached(
    async () => {
      const article = await db.query.articles.findFirst({
        where: eq(articles.slug, slug),
        with: {
          hero: true,
          category: true,
          author: { columns: { displayName: true } },
          articleTags: { with: { tag: true } },
        },
      });
      // Only published articles are visible (draft/scheduled/archived → 404).
      if (!article || article.status !== "published") return null;

      // Related: manual pins first (in sort order)…
      const pins = await db.query.articleRelated.findMany({
        where: eq(articleRelated.articleId, article.id),
        orderBy: [asc(articleRelated.sort)],
        with: { relatedArticle: { with: { hero: true, category: true } } },
      });
      const related = pins
        .map((p) => p.relatedArticle)
        .filter((a) => a.status === "published");

      // …topped up to 4 with recent same-category stories.
      if (related.length < 4) {
        const fill = await db.query.articles.findMany({
          where:
            article.categoryId !== null
              ? and(
                  eq(articles.status, "published"),
                  eq(articles.categoryId, article.categoryId),
                )
              : eq(articles.status, "published"),
          orderBy: [desc(articles.publishedAt)],
          limit: 8,
          with: { hero: true, category: true },
        });
        const seen = new Set([article.id, ...related.map((r) => r.id)]);
        for (const a of fill) {
          if (related.length >= 4) break;
          if (seen.has(a.id)) continue;
          seen.add(a.id);
          related.push(a);
        }
      }

      return { article, related: related.slice(0, 4) };
    },
    ["article", slug],
    [TAGS.article(slug), TAGS.articles],
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getArticleBundle(slug);
  if (!bundle) return { title: "Article not found" };

  const { article } = bundle;
  const og = mediaUrl(article.hero?.path);
  return {
    title: article.title,
    description: article.standfirst ?? undefined,
    openGraph: {
      title: article.title,
      description: article.standfirst ?? undefined,
      type: "article",
      images: og ? [{ url: og }] : undefined,
    },
  };
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const bundle = await getArticleBundle(slug);
  if (!bundle) notFound();

  const { article, related } = bundle;
  const heroImg = mediaUrl(article.hero?.path);
  const byline = article.authorNameOverride ?? article.author?.displayName ?? "CTR";
  const tagList = article.articleTags.map((t) => t.tag);

  return (
    <main>
      {/* ── Header + hero ────────────────────────────────────────────────── */}
      <div className="bg-surface-1">
        <div className="f1-inner py-8 lg:py-12">
          <header className="max-w-[860px]">
            <div className="flex flex-wrap items-center gap-2">
              {article.isBreaking ? <Tag variant="breaking">Breaking</Tag> : null}
              {article.category ? (
                <Link href={`/latest/${article.category.slug}`}>
                  <Tag variant="brand">{article.category.name}</Tag>
                </Link>
              ) : null}
            </div>

            <h1 className="display-2xl lg:display-3xl mt-4 font-black uppercase text-text-5">
              {article.title}
            </h1>

            {article.standfirst ? (
              <p className="body-m lg:body-l mt-4 font-semibold text-text-3">
                {article.standfirst}
              </p>
            ) : null}

            <div className="body-xs mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-surface-4 py-3">
              <span className="font-bold uppercase text-text-5">By {byline}</span>
              {article.publishedAt ? (
                <time
                  dateTime={new Date(article.publishedAt).toISOString()}
                  className="font-semibold uppercase text-text-3"
                >
                  {format(new Date(article.publishedAt), "d MMMM yyyy")}
                </time>
              ) : null}
            </div>
          </header>

          {heroImg ? (
            <figure className="mt-8">
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-surface-3">
                <Image
                  src={heroImg}
                  alt={article.hero?.alt ?? article.title}
                  fill
                  priority
                  sizes="(max-width: 1069px) 100vw, 1100px"
                  className="object-cover"
                />
              </div>
              {article.hero?.caption || article.hero?.credit ? (
                <figcaption className="body-xs mt-2 flex flex-wrap justify-between gap-2 text-text-3">
                  <span>{article.hero?.caption}</span>
                  {article.hero?.credit ? (
                    <span className="uppercase">{article.hero.credit}</span>
                  ) : null}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          {/* ── Body ───────────────────────────────────────────────────────── */}
          <div className="mt-8 max-w-[680px]">
            <ArticleBody html={article.bodyHtml ?? ""} />

            {/* save button — fan-session dependent, deliberately not cached */}
            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-surface-4 pt-6">
              <Suspense fallback={<span className="btn btn-sm btn-stroke">Save article</span>}>
                <SaveArticleButton articleId={article.id} />
              </Suspense>
              {tagList.length ? (
                <span className="body-xs flex flex-wrap items-center gap-2 font-semibold text-text-3">
                  Tagged:
                  {tagList.map((t) => (
                    <Link
                      key={t.id}
                      href={`/latest/tags/${t.slug}`}
                      className="text-brand hover:underline"
                    >
                      {t.name}
                    </Link>
                  ))}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── Related ──────────────────────────────────────────────────────── */}
      {related.length ? (
        <section className="bg-surface-3">
          <div className="f1-inner py-8 lg:py-12">
            <h2 className="display-xl lg:display-2xl font-black uppercase text-text-5">
              Related news
            </h2>
            <div className="mt-6">
              <ArticleGrid articles={related} />
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
