import { and, asc, count, desc, eq } from "drizzle-orm";
import { articleCategories, articles, db, TAGS } from "@ctr/db";
import { cached } from "@/lib/cache";

export const ARTICLES_PER_PAGE = 12;

/** All article categories, ordered — for the /latest filter pills. */
export function getCategories() {
  return cached(
    () =>
      db.query.articleCategories.findMany({
        orderBy: [asc(articleCategories.sort), asc(articleCategories.name)],
      }),
    ["article-categories"],
    [TAGS.articles],
  );
}

export function getCategoryBySlug(slug: string) {
  return cached(
    () => db.query.articleCategories.findFirst({ where: eq(articleCategories.slug, slug) }),
    ["article-category", slug],
    [TAGS.articles],
  );
}

/** One page of published articles (optionally within a category), plus total count. */
export function getArticlePage(categoryId: number | null, page: number) {
  const where =
    categoryId === null
      ? eq(articles.status, "published")
      : and(eq(articles.status, "published"), eq(articles.categoryId, categoryId));

  return cached(
    async () => {
      const [rows, totals] = await Promise.all([
        db.query.articles.findMany({
          where,
          orderBy: [desc(articles.publishedAt)],
          limit: ARTICLES_PER_PAGE,
          offset: (page - 1) * ARTICLES_PER_PAGE,
          with: { hero: true, category: true },
        }),
        db.select({ total: count() }).from(articles).where(where),
      ]);
      return { rows, total: totals[0]?.total ?? 0 };
    },
    ["article-grid", categoryId === null ? "all" : String(categoryId), String(page)],
    [TAGS.articles],
  );
}
