import { OverlayArticleCard } from "./article-card";
import type { ArticleCardData } from "./article-card";

/** Lead-story hero card — the big overlay card of the homepage hero grid.
 *  Fixed heights per the spec: 260 → 334 (≥640) → 378 (≥735) → 460 (≥856) →
 *  476 (≥1069) → 486 (≥1280). Pass `live` to fly the blue LIVE tag above the
 *  headline when a race weekend is running. */
export function HeroArticle({
  article,
  live = null,
}: {
  article: ArticleCardData;
  live?: string | null;
}) {
  return (
    <OverlayArticleCard
      article={article}
      priority
      live={live}
      heightClass="h-[260px] min-[640px]:h-[334px] md:h-[378px] min-[856px]:h-[460px] lg:h-[476px] min-[1280px]:h-[486px]"
      titleClass="display-m font-normal md:text-[1.25rem] md:leading-6 lg:text-[1.5rem] lg:leading-7"
      sizes="(max-width: 856px) 100vw, 60vw"
    />
  );
}
