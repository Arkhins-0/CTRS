import { ArticleCard } from "./article-card";
import { CategoryPills } from "./category-pills";
import { Pagination } from "./pagination";
import { ARTICLES_PER_PAGE, getArticlePage, getCategories } from "./queries";

/**
 * Shared news-hub body: heading, category filter pills, paginated article
 * grid. Used by /latest and /latest/[categorySlug].
 */
export async function ArticleHub({
  title,
  categoryId,
  activeSlug,
  page,
  basePath,
}: {
  title: string;
  categoryId: number | null;
  activeSlug: string | null;
  page: number;
  basePath: string;
}) {
  const [categories, { rows, total }] = await Promise.all([
    getCategories(),
    getArticlePage(categoryId, page),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / ARTICLES_PER_PAGE));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="border-l-4 border-accent pl-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
        {title}
      </h1>

      <div className="mt-6">
        <CategoryPills categories={categories} activeSlug={activeSlug} />
      </div>

      {rows.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-center text-sm font-semibold uppercase tracking-wide text-fg-faint">
          No articles here yet — check back soon.
        </p>
      )}

      <Pagination page={page} totalPages={totalPages} basePath={basePath} />
    </main>
  );
}
