import { asc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { contentBlocks, db, media, pages, sponsors, TAGS } from "@ctr/db";
import {
  type BlockMedia,
  BlockRenderer,
} from "@/components/news/block-renderer";
import { cached } from "@/lib/cache";
import { mediaUrl } from "@/lib/media";

type Props = { params: Promise<{ pageSlug: string }> };

/* ── Cached page bundle: page + blocks + referenced media + sponsors ─────── */

function getPageBundle(slug: string) {
  return cached(
    async () => {
      const page = await db.query.pages.findFirst({
        where: eq(pages.slug, slug),
        with: {
          blocks: { orderBy: [asc(contentBlocks.sort)] },
          ogImage: true,
        },
      });
      if (!page || page.status !== "published") return null;

      // Resolve media rows referenced by image / image_grid blocks.
      const mediaIds = new Set<string>();
      for (const b of page.blocks) {
        const d = b.data as { mediaId?: string; items?: { mediaId?: string }[] } | null;
        if (b.type === "image" && d?.mediaId) mediaIds.add(d.mediaId);
        if (b.type === "image_grid") {
          for (const item of d?.items ?? []) {
            if (item?.mediaId) mediaIds.add(item.mediaId);
          }
        }
      }
      const mediaRows = mediaIds.size
        ? await db.select().from(media).where(inArray(media.id, [...mediaIds]))
        : [];

      // Active sponsors only when a sponsor_grid block is present.
      const needsSponsors = page.blocks.some((b) => b.type === "sponsor_grid");
      const sponsorRows = needsSponsors
        ? await db.query.sponsors.findMany({
            where: eq(sponsors.isActive, true),
            orderBy: [asc(sponsors.sort)],
            with: { logo: true },
          })
        : [];

      return { page, mediaRows, sponsorRows };
    },
    ["cms-page", slug],
    [TAGS.page(slug), TAGS.pages, TAGS.sponsors],
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pageSlug } = await params;
  const bundle = await getPageBundle(pageSlug);
  if (!bundle) return { title: "Page not found" };

  const { page } = bundle;
  const og = mediaUrl(page.ogImage?.path);
  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
    openGraph: {
      title: page.metaTitle ?? page.title,
      description: page.metaDescription ?? undefined,
      images: og ? [{ url: og }] : undefined,
    },
  };
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function CmsPage({ params }: Props) {
  const { pageSlug } = await params;
  const bundle = await getPageBundle(pageSlug);
  if (!bundle) notFound();

  const { page, mediaRows, sponsorRows } = bundle;

  const mediaById: Record<string, BlockMedia> = {};
  for (const m of mediaRows) mediaById[m.id] = m;

  // Pages whose first block is a hero get their title from it; otherwise
  // render a standard dark title band so every page opens F1-style.
  const hasHeroBlock = page.blocks[0]?.type === "hero";

  return (
    <main className="pb-16">
      {!hasHeroBlock ? (
        <header className="bg-surface-3">
          <div className="f1-inner py-8 lg:py-12">
            <h1 className="display-xl lg:display-2xl font-black uppercase text-text-5">
              {page.title}
            </h1>
          </div>
        </header>
      ) : null}

      <BlockRenderer
        blocks={page.blocks}
        mediaById={mediaById}
        sponsors={sponsorRows}
        pageTitle={page.title}
      />
    </main>
  );
}
