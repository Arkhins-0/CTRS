import Link from "next/link";
import { mediaUrl } from "@/lib/media";
import { ArticleBody } from "./article-body";

/* ── Block data shapes (contentBlocks.data jsonb) ────────────────────────── */

type HeroData = { heading?: string; sub?: string };
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
    <section className="bg-carbon-fibre">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
        <h1 className="max-w-3xl text-4xl font-black uppercase leading-tight tracking-tight text-white sm:text-5xl">
          {data.heading ?? pageTitle}
        </h1>
        {data.sub ? <p className="mt-4 max-w-2xl text-lg text-warm-grey">{data.sub}</p> : null}
        <div className="mt-6 h-1 w-24 bg-f1-red" aria-hidden />
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
      <img src={src} alt={item.alt ?? media?.alt ?? ""} className="chamfer-tr h-auto w-full" />
      {caption ? (
        <figcaption className="mt-2 text-sm text-f1-grey">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

function CtaBlock({ data }: { data: CtaData }) {
  return (
    <section className="my-12 bg-carbon-fibre">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-12 text-center">
        {data.heading ? (
          <h2 className="max-w-2xl text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            {data.heading}
          </h2>
        ) : null}
        {data.href && data.buttonLabel ? (
          <Link
            href={data.href}
            className="chamfer-tr bg-f1-red px-8 py-3 text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-f1-red-dark"
          >
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
    <div className="mx-auto my-10 max-w-3xl px-4">
      <div className="chamfer-tr overflow-hidden border border-warm-grey bg-white">
        {items.map((item, i) => (
          <details key={i} className="group border-b border-warm-grey last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-black uppercase tracking-tight text-carbon transition-colors hover:text-f1-red">
              {item.q}
              <span
                aria-hidden
                className="text-lg font-black text-f1-red transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="px-5 pb-5 text-[15px] leading-relaxed text-f1-grey">
              <p>{item.a}</p>
            </div>
          </details>
        ))}
      </div>
    </div>
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
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-f1-grey">
        {label}
      </p>
      <ul className="mt-5 flex flex-wrap items-stretch justify-center gap-4">
        {sponsors.map((s) => {
          const logo = mediaUrl(s.logo?.path);
          const card = (
            <span
              className={`chamfer-tr flex h-full items-center justify-center border border-warm-grey bg-white transition-transform duration-200 hover:-translate-y-0.5 ${
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
                  className={`font-black uppercase tracking-wider text-carbon ${
                    size === "lg" ? "text-lg" : "text-sm"
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
  const global = sponsors.filter((s) => s.tier === "global_partner");
  const official = sponsors.filter((s) => s.tier === "official_partner");
  const suppliers = sponsors.filter((s) => s.tier === "supplier");
  if (!sponsors.length) return null;
  return (
    <div className="mx-auto my-10 max-w-7xl space-y-12 px-4">
      <SponsorTierRow label="Global Partners" sponsors={global} size="lg" />
      <SponsorTierRow label="Official Partners" sponsors={official} size="sm" />
      <SponsorTierRow label="Suppliers" sponsors={suppliers} size="sm" />
    </div>
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
              <div key={block.id} className="mx-auto my-10 max-w-3xl px-4">
                <ArticleBody html={html} />
              </div>
            );
          }

          case "image": {
            const item = block.data as ImageItem;
            return (
              <div key={block.id} className="mx-auto my-10 max-w-4xl px-4">
                <ImageFigure
                  item={item}
                  media={item.mediaId ? mediaById[item.mediaId] : undefined}
                />
              </div>
            );
          }

          case "image_grid": {
            const { items = [] } = block.data as ImageGridData;
            if (!items.length) return null;
            return (
              <div key={block.id} className="mx-auto my-10 max-w-5xl px-4">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item, i) => (
                    <ImageFigure
                      key={i}
                      item={item}
                      media={item.mediaId ? mediaById[item.mediaId] : undefined}
                    />
                  ))}
                </div>
              </div>
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
              <div
                key={block.id}
                className="mx-auto my-10 max-w-4xl px-4"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }

          default:
            return null;
        }
      })}
    </>
  );
}
