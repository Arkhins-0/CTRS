import { ArticleGrid, NewsEmpty } from "./article-card";
import { CategoryPills } from "./category-pills";
import { Pagination } from "./pagination";
import { ARTICLES_PER_PAGE, getArticlePage, getCategories } from "./queries";

/* ── News hub band ─────────────────────────────────────────────────────────
   Warm band (surface-3) carrying the uppercase page H1, the category pill
   row and the editor's-picks article grid, closed by pill pagination —
   the news-side mirror of ResultsHub. ─────────────────────────────────────── */

export function NewsHubBand({
  title,
  kicker,
  note,
  filters,
  children,
}: {
  title: string;
  kicker?: string | null;
  note?: string | null;
  filters?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="bg-surface-3 pb-16">
      <div className="f1-inner pt-8">
        {kicker ? (
          <p className="display-s font-normal uppercase text-brand">{kicker}</p>
        ) : null}
        <h1 className="display-xl lg:display-2xl font-black uppercase text-text-5">{title}</h1>
        {note ? <p className="body-xs mt-2 text-text-3">{note}</p> : null}
        {filters ? <div className="mt-6">{filters}</div> : null}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

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
    <NewsHubBand
      title={title}
      note={total > 0 ? `${total} ${total === 1 ? "story" : "stories"}` : null}
      filters={<CategoryPills categories={categories} activeSlug={activeSlug} />}
    >
      {rows.length ? (
        <ArticleGrid articles={rows} />
      ) : (
        <NewsEmpty>No stories have been published here yet — check back soon.</NewsEmpty>
      )}
      <Pagination page={page} totalPages={totalPages} basePath={basePath} />
    </NewsHubBand>
  );
}
