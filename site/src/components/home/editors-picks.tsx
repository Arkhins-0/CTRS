import { ArticleGrid, type ArticleCardData } from "@/components/news/article-card";
import { BandHeading } from "./band";

/* ── Band 3 · white editor's-picks grid ────────────────────────────────────
   The alternating wide-overlay / warm-stacked grid, on the white surface.
   Renders nothing when there are no stories left after the hero block. ───── */

export function EditorsPicksBand({
  articles,
  title = "Editor's Picks",
  viewAllHref = "/latest",
}: {
  articles: ArticleCardData[];
  title?: string;
  viewAllHref?: string;
}) {
  if (!articles.length) return null;

  return (
    <section className="bg-surface-1 text-text-5">
      <div className="f1-inner flex flex-col gap-8 py-6 md:py-8">
        <div className="flex flex-col gap-4 lg:gap-6">
          <BandHeading viewAllHref={viewAllHref}>{title}</BandHeading>
          <ArticleGrid articles={articles} />
        </div>
      </div>
    </section>
  );
}
