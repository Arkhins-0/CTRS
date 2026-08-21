import Link from "next/link";
import { mediaUrl } from "@/lib/media";
import { ArticleBody } from "./article-body";

/* ── CMS content blocks in the F1.com 2026 band system ─────────────────────
   Every block is a full-width band (dark hero, warm CTA, white content) with
   an `.f1-inner` gutter; reading copy is capped at 680px, media is rounded-md
   and nothing carries a shadow. Kept synchronous — media rows and sponsors
   are resolved by the page inside its cached() bundle. ───────────────────── */

/* ── Block data shapes (contentBlocks.data jsonb) ────────────────────────── */

type HeroData = { kicker?: string; heading?: string; sub?: string };
type RichTextData = { html?: string };
type ImageItem = { mediaId?: string; url?: string; alt?: string; caption?: string };
type ImageGridData = { items?: ImageItem[] };
type CtaData = { heading?: string; buttonLabel?: string; href?: string };
type FaqData = { items?: { q: string; a: string }[] };
type RawHtmlData = { html?: string };

export type BlockRow = {
  id: string;
  type:
    | "hero"
    | "rich_text"
    | "image"
    | "image_grid"
    | "cta"
    | "faq"
    | "sponsor_grid"
    | "raw_html";
  sort: number;
  data: unknown;
};

export type BlockMedia = {
  id: string;
  path: string;
  alt: string | null;
  caption: string | null;
};

export type BlockSponsor = {
  id: string;
  name: string;
  tier: "global_partner" | "official_partner" | "supplier";
  url: string | null;
  logo?: { path: string } | null;
};

/* ── Individual blocks ───────────────────────────────────────────────────── */

function HeroBlock({ data, pageTitle }: { data: HeroData; pageTitle: string }) {
  return (
    <section className="dark-section bg-surface-3">
      <div className="f1-inner py-12 lg:py-16">
        <p className="display-s font-normal uppercase text-brand">
          {data.kicker ?? "CTR Sports"}
        </p>
        <h1 className="display-2xl lg:display-3xl mt-3 max-w-3xl font-black uppercase text-text-5">
          {data.heading ?? pageTitle}
        </h1>
        {data.sub ? (
          <p className="body-m mt-4 max-w-[680px] text-text-3">{data.sub}</p>
        ) : null}
      </div>
    </section>
  );
}

function ImageFigure({ item, media }: { item: ImageItem; media: BlockMedia | undefined }) {
  const src = media ? mediaUrl(media.path) : (item.url ?? null);
  if (!src) return null;
  const caption = item.caption ?? media?.caption ?? null;
  return (
    <figure>
      {/* CMS images have unknown dimensions — plain <img> by design */}
      <img
        src={src}
        alt={item.alt ?? media?.alt ?? ""}
        className="h-auto w-full rounded-md object-cover"
      />
      {caption ? (
        <figcaption className="body-xs mt-2 text-text-3">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

function CtaBlock({ data }: { data: CtaData }) {
  if (!data.heading && !(data.href && data.buttonLabel)) return null;
  return (
    <section className="bg-surface-3">
      <div className="f1-inner flex flex-col items-center gap-6 py-12 text-center lg:py-16">
        {data.heading ? (
          <h2 className="display-xl lg:display-2xl max-w-2xl font-black uppercase text-text-5">
            {data.heading}
          </h2>
        ) : null}
        {data.href && data.buttonLabel ? (
          <Link href={data.href} className="btn btn-md btn-brand">
            {data.buttonLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function FaqBlock({ data }: { data: FaqData }) {
  const items = data.items ?? [];
  if (!items.length) return null;
  return (
    <section className="bg-surface-1">
      <div className="f1-inner py-8">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-md bg-surface-3">
          {items.map((item, i) => (
            <details key={i} className="group border-b border-surface-4 last:border-b-0">
              <summary className="body-m-compact flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold text-text-5 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="display-l shrink-0 font-medium text-brand transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="body-s px-5 pb-5 text-text-3">
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function SponsorTierRow({
  label,
  sponsors,
  size,
}: {
  label: string;
  sponsors: BlockSponsor[];
  size: "lg" | "sm";
}) {
  if (!sponsors.length) return null;
  return (
    <div>
      <p className="display-s text-center font-medium uppercase text-text-3">{label}</p>
      <ul className="mt-6 flex flex-wrap items-stretch justify-center gap-4">
        {sponsors.map((s) => {
          const logo = mediaUrl(s.logo?.path);
          const card = (
            <span
              className={`flex h-full items-center justify-center rounded-md bg-surface-3 transition-colors hover:bg-surface-4 ${
                size === "lg" ? "min-w-[180px] px-8 py-6" : "min-w-[140px] px-6 py-4"
              }`}
            >
              {logo ? (
                // Sponsor logos have unknown dimensions — plain <img> by design
                <img
                  src={logo}
                  alt={s.name}
                  className={`w-auto object-contain ${size === "lg" ? "h-12" : "h-8"}`}
                />
              ) : (
                <span
                  className={`font-medium uppercase text-text-5 ${
                    size === "lg" ? "display-l" : "display-m"
                  }`}
                >
                  {s.name}
                </span>
              )}
            </span>
          );
          return (
            <li key={s.id}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="block h-full">
                  {card}
                </a>
              ) : (
                card
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SponsorGridBlock({ sponsors }: { sponsors: BlockSponsor[] }) {
  if (!sponsors.length) return null;
  return (
    <section className="bg-surface-1">
      <div className="f1-inner flex flex-col gap-12 py-12">
        <SponsorTierRow
          label="Title Partners"
          sponsors={sponsors.filter((s) => s.tier === "global_partner")}
          size="lg"
        />
        <SponsorTierRow
          label="CTR Associates"
          sponsors={sponsors.filter((s) => s.tier === "official_partner")}
          size="sm"
        />
        <SponsorTierRow
          label="Championship Partners"
          sponsors={sponsors.filter((s) => s.tier === "supplier")}
          size="sm"
        />
      </div>
    </section>
  );
}

/* ── Renderer ────────────────────────────────────────────────────────────── */

/**
 * Renders a CMS page's content blocks in `sort` order. Media rows and active
 * sponsors are resolved by the page (inside its cached() bundle) and passed
 * in, so this component stays synchronous and cache-friendly.
 */
export function BlockRenderer({
  blocks,
  mediaById,
  sponsors,
  pageTitle,
}: {
  blocks: BlockRow[];
  mediaById: Record<string, BlockMedia>;
  sponsors: BlockSponsor[];
  pageTitle: string;
}) {
  return (
    <>
      {blocks.map((block) => {
        switch (block.type) {
          case "hero":
            return (
              <HeroBlock key={block.id} data={block.data as HeroData} pageTitle={pageTitle} />
            );

          case "rich_text": {
            const { html } = block.data as RichTextData;
            if (!html) return null;
            return (
              <section key={block.id} className="bg-surface-1">
                <div className="f1-inner py-8">
                  <div className="mx-auto max-w-[680px]">
                    <ArticleBody html={html} />
                  </div>
                </div>
              </section>
            );
          }

          case "image": {
            const item = block.data as ImageItem;
            return (
              <section key={block.id} className="bg-surface-1">
                <div className="f1-inner py-8">
                  <div className="mx-auto max-w-4xl">
                    <ImageFigure
                      item={item}
                      media={item.mediaId ? mediaById[item.mediaId] : undefined}
                    />
                  </div>
                </div>
              </section>
            );
          }

          case "image_grid": {
            const { items = [] } = block.data as ImageGridData;
            if (!items.length) return null;
            return (
              <section key={block.id} className="bg-surface-1">
                <div className="f1-inner py-8">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                    {items.map((item, i) => (
                      <ImageFigure
                        key={i}
                        item={item}
                        media={item.mediaId ? mediaById[item.mediaId] : undefined}
                      />
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          case "cta":
            return <CtaBlock key={block.id} data={block.data as CtaData} />;

          case "faq":
            return <FaqBlock key={block.id} data={block.data as FaqData} />;

          case "sponsor_grid":
            return <SponsorGridBlock key={block.id} sponsors={sponsors} />;

          case "raw_html": {
            const { html } = block.data as RawHtmlData;
            if (!html) return null;
            return (
              <section key={block.id} className="bg-surface-1">
                <div
                  className="f1-inner py-8"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </section>
            );
          }

          default:
            return null;
        }
      })}
    </>
  );
}
