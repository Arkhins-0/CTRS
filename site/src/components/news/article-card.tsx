import Image from "next/image";
import Link from "next/link";
import { mediaUrl, placeholderStyle } from "@/lib/media";

/* ── F1.com 2026 article card family ───────────────────────────────────────
   Overlay (image + bottom gradient caption), stacked (warm card, image on
   top), featured (transparent, title below image) and thumb-row (48px rail)
   variants. All follow the system card conventions: rounded-md, no shadows,
   image zoom on group hover + title underline, stretched-link coverage. ──── */

export type ArticleCardData = {
  slug: string;
  title: string;
  standfirst: string | null;
  publishedAt: Date | string | null;
  isBreaking?: boolean;
  hero?: { path: string; alt: string | null } | null;
  category?: { slug: string; name: string } | null;
};

export function articleHref(article: Pick<ArticleCardData, "slug">): string {
  return `/latest/article/${article.slug}`;
}

/* ── Tag chip (small size: 2px 4px pad, radius 2px, Titillium 700 12/16) ─── */

export function Tag({
  variant = "brand",
  children,
}: {
  variant?: "brand" | "breaking" | "live" | "secondary";
  children: React.ReactNode;
}) {
  const skins: Record<string, string> = {
    brand: "bg-brand text-brand-fg",
    breaking: "bg-breaking-yellow text-black",
    // Poster face + a touch of tracking: the one badge on the site built
    // to read as a stamp rather than a label — see globals.css --font-poster.
    live: "bg-live-blue text-white tracking-wide",
    secondary: "bg-black/10 text-text-5",
  };
  return (
    <span
      className={`body-2xs inline-flex items-center gap-1 whitespace-nowrap rounded-xs px-1 py-0.5 font-bold uppercase ${skins[variant]}`}
      style={variant === "live" ? { fontFamily: "var(--font-poster)" } : undefined}
    >
      {variant === "live" ? (
        <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}

function CardImage({
  article,
  sizes,
  priority = false,
}: {
  article: ArticleCardData;
  sizes: string;
  priority?: boolean;
}) {
  const img = mediaUrl(article.hero?.path);
  if (!img) {
    return <div className="absolute inset-0" style={placeholderStyle(article.title)} />;
  }
  return (
    <Image
      src={img}
      alt={article.hero?.alt ?? article.title}
      fill
      priority={priority}
      sizes={sizes}
      className="card-img object-cover"
    />
  );
}

function CardTags({ article, live }: { article: ArticleCardData; live?: string | null }) {
  if (!live && !article.isBreaking && !article.category) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {live ? <Tag variant="live">{live}</Tag> : null}
      {article.isBreaking ? <Tag variant="breaking">Breaking</Tag> : null}
      {article.category ? <Tag>{article.category.name}</Tag> : null}
    </span>
  );
}

/* ── Overlay card — hero / editor's-picks wide (image + gradient caption) ── */

export function OverlayArticleCard({
  article,
  heightClass,
  titleClass = "display-l font-normal min-[1696px]:text-[2rem] min-[1696px]:leading-[2.375rem]",
  sizes = "(max-width: 1069px) 100vw, 66vw",
  priority = false,
  live = null,
}: {
  article: ArticleCardData;
  /** Fixed-height classes per the spec (heights win over aspect ratio). */
  heightClass: string;
  titleClass?: string;
  sizes?: string;
  priority?: boolean;
  /** Label for the blue LIVE tag (e.g. a race weekend in progress). */
  live?: string | null;
}) {
  return (
    <article
      className={`group relative overflow-clip rounded-md border border-surface-4 bg-surface-1 ${heightClass}`}
    >
      <CardImage article={article} sizes={sizes} priority={priority} />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.54)_38%,rgba(0,0,0,0.87)_72%,#000_100%)]"
      />
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 text-white md:p-6">
        <CardTags article={article} live={live} />
        <Link
          href={articleHref(article)}
          className={`${titleClass} text-white after:absolute after:inset-0 group-hover:underline`}
        >
          {article.title}
        </Link>
      </span>
    </article>
  );
}

/* ── Stacked card — warm surface, image on top, Titillium title ──────────── */

export function StackedArticleCard({
  article,
  sizes = "(max-width: 735px) 50vw, 25vw",
}: {
  article: ArticleCardData;
  sizes?: string;
}) {
  return (
    <article className="race-line group relative flex h-full flex-col overflow-clip rounded-md border border-surface-4 bg-surface-1">
      <span className="relative block h-[106px] shrink-0 overflow-clip md:h-[155px] min-[1696px]:h-[293px]">
        <CardImage article={article} sizes={sizes} />
      </span>
      <span className="flex flex-1 flex-col gap-1 p-2 md:gap-2 md:p-4">
        <CardTags article={article} />
        <Link
          href={articleHref(article)}
          className="body-s font-normal text-text-4 after:absolute after:inset-0 group-hover:underline md:text-[1.0625rem] md:leading-6 min-[1696px]:text-[1.25rem] min-[1696px]:leading-8"
        >
          {article.title}
        </Link>
      </span>
    </article>
  );
}

/* ── Featured card — transparent, image + title below (dark hero band) ───── */

export function FeaturedArticleCard({
  article,
  sizes = "(max-width: 735px) 50vw, 20vw",
}: {
  article: ArticleCardData;
  sizes?: string;
}) {
  return (
    <article className="group relative flex flex-col gap-2">
      <span className="relative block h-[120px] overflow-clip rounded-md md:h-[82px] lg:h-[126px]">
        <CardImage article={article} sizes={sizes} />
      </span>
      <Link
        href={articleHref(article)}
        className="body-xs font-semibold text-current after:absolute after:inset-0 group-hover:underline md:text-[1rem] md:leading-5"
      >
        {article.title}
      </Link>
    </article>
  );
}

/* ── Thumb row — 48px thumbnail list item (hero band right rail) ─────────── */

export function ThumbRowArticle({ article }: { article: ArticleCardData }) {
  return (
    <article className="group relative flex min-h-12 gap-2 border-t border-surface-4 pt-2 lg:gap-3 min-[1280px]:flex-row-reverse min-[1280px]:pt-3">
      <span className="relative block h-12 w-12 shrink-0 overflow-clip rounded-sm">
        <CardImage article={article} sizes="48px" />
      </span>
      <Link
        href={articleHref(article)}
        className="body-xs flex-1 font-semibold text-current after:absolute after:inset-0 group-hover:underline md:text-[1rem] md:leading-5"
      >
        {article.title}
      </Link>
    </article>
  );
}

/** Default news card (hubs, related rails, tag archives) — the stacked card. */
export function ArticleCard({ article }: { article: ArticleCardData }) {
  return <StackedArticleCard article={article} />;
}

/* ── Editor's-picks grid ───────────────────────────────────────────────────
   2 → 4 columns, alternating a wide overlay card (span 2) with pairs of warm
   stacked cards. The 6-slot pattern (wide, 2 stacked, 2 stacked, wide) tiles
   to any length, so the same component drives the homepage picks band, the
   /latest hubs and the tag archives. ─────────────────────────────────────── */

const PICKS_OVERLAY_HEIGHT =
  "h-[234px] md:h-[420px] lg:h-[360px] min-[1696px]:h-[600px]";
const PICKS_STACKED_HEIGHT = "min-h-[242px] md:min-h-[360px] min-[1696px]:min-h-[600px]";

export function ArticleGrid({ articles }: { articles: ArticleCardData[] }) {
  if (!articles.length) return null;
  return (
    <ul className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4 lg:gap-6">
      {articles.map((article, i) => {
        const slot = i % 6;
        const wide = slot === 0 || slot === 5;
        return (
          <li
            key={article.slug}
            className={wide ? "col-span-2" : PICKS_STACKED_HEIGHT}
          >
            {wide ? (
              <OverlayArticleCard
                article={article}
                heightClass={PICKS_OVERLAY_HEIGHT}
                sizes="(max-width: 735px) 100vw, (max-width: 1069px) 100vw, 50vw"
              />
            ) : (
              <StackedArticleCard article={article} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Empty-state copy block matching the racing hubs' empty card. */
export function NewsEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-surface-1 px-6 py-8 md:px-8">
      <p className="body-s text-text-3">{children}</p>
    </div>
  );
}
