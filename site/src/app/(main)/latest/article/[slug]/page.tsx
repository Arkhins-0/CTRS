import { format } from "date-fns";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { articleRelated, articles, db, TAGS } from "@ctr/db";
import { Badge, SectionHeading } from "@ctr/ui";
import { ArticleBody } from "@/components/news/article-body";
import { ArticleCard } from "@/components/news/article-card";
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
  const byline = article.authorNameOverride ?? article.author?.displayName ?? "CTR Sports";
  const tagList = article.articleTags.map((t) => t.tag);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* header */}
      <header className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center gap-2">
          {article.isBreaking ? <Badge tone="red">Breaking</Badge> : null}
          {article.category ? (
            <Link href={`/latest/${article.category.slug}`}>
              <Badge tone="dark">{article.category.name}</Badge>
            </Link>
          ) : null}
          {tagList.map((t) => (
            <Link key={t.id} href={`/latest/tags/${t.slug}`}>
              <Badge tone="outline">{t.name}</Badge>
            </Link>
          ))}
        </div>

        <h1 className="mt-4 text-3xl font-black uppercase leading-tight tracking-tight text-carbon sm:text-4xl lg:text-5xl">
          {article.title}
        </h1>

        {article.standfirst ? (
          <p className="mt-4 text-lg font-semibold leading-relaxed text-f1-grey sm:text-xl">
            {article.standfirst}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-warm-grey py-3 text-sm">
          <span className="font-bold uppercase tracking-wide text-carbon">By {byline}</span>
          {article.publishedAt ? (
            <time
              dateTime={new Date(article.publishedAt).toISOString()}
              className="font-semibold uppercase tracking-wide text-f1-grey"
            >
              {format(new Date(article.publishedAt), "d MMMM yyyy")}
            </time>
          ) : null}
        </div>
      </header>

      {/* hero image */}
      {heroImg ? (
        <figure className="mx-auto mt-8 max-w-5xl">
          <div className="chamfer-tr-lg relative aspect-video w-full overflow-hidden bg-carbon">
            <Image
              src={heroImg}
              alt={article.hero?.alt ?? article.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
          {article.hero?.caption || article.hero?.credit ? (
            <figcaption className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-f1-grey">
              <span>{article.hero?.caption}</span>
              {article.hero?.credit ? (
                <span className="text-xs uppercase tracking-wide text-f1-grey-light">
                  {article.hero.credit}
                </span>
              ) : null}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      {/* body */}
      <div className="mx-auto mt-8 max-w-3xl">
        <ArticleBody html={article.bodyHtml ?? ""} />

        {/* save button — fan-session dependent, deliberately not cached */}
        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-warm-grey pt-6">
          <Suspense
            fallback={
              <span className="chamfer-tr bg-warm-grey px-5 py-2 text-xs font-black uppercase tracking-wide text-f1-grey">
                Save article
              </span>
            }
          >
            <SaveArticleButton articleId={article.id} />
          </Suspense>
          {tagList.length ? (
            <span className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-f1-grey">
              Tagged:
              {tagList.map((t) => (
                <Link
                  key={t.id}
                  href={`/latest/tags/${t.slug}`}
                  className="text-f1-red transition-colors hover:text-carbon"
                >
                  {t.name}
                </Link>
              ))}
            </span>
          ) : null}
        </div>
      </div>

      {/* related */}
      {related.length ? (
        <section className="mt-14">
          <SectionHeading>Related News</SectionHeading>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
