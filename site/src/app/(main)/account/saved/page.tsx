import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { X } from "lucide-react";
import { db, savedArticles } from "@ctr/db";
import { ChamferCard, SectionHeading } from "@ctr/ui";
import { requireFan } from "@/lib/fan-auth";
import { mediaUrl, placeholderStyle } from "@/lib/media";
import { removeSavedArticle } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved articles",
  description: "Stories you bookmarked to read later.",
};

export default async function SavedArticlesPage() {
  const { fan } = await requireFan();

  const rows = await db.query.savedArticles.findMany({
    where: eq(savedArticles.fanId, fan.id),
    with: { article: { with: { hero: true, category: true } } },
    orderBy: [desc(savedArticles.createdAt)],
  });
  const saved = rows.filter((r) => r.article.status === "published");

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <SectionHeading
        right={
          <Link href="/account" className="uppercase text-accent hover:underline">
            ← My account
          </Link>
        }
      >
        Saved articles
      </SectionHeading>

      {saved.length === 0 ? (
        <ChamferCard className="mt-6 border border-dashed border-line bg-surface p-10 text-center">
          <p className="text-lg font-black uppercase tracking-tight text-white">
            Nothing saved yet
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            Tap the bookmark on any story to keep it here for later.
          </p>
          <Link
            href="/latest"
            className="chamfer-tr mt-5 inline-block bg-accent px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-accent-fg transition-colors hover:bg-accent-dark"
          >
            Browse the latest news
          </Link>
        </ChamferCard>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map(({ article, createdAt }) => {
            const heroUrl = mediaUrl(article.hero?.path);
            return (
              <ChamferCard
                key={article.id}
                className="group flex h-full flex-col border border-line bg-surface transition-all hover:-translate-y-0.5 hover:border-accent"
              >
                <Link href={`/latest/${article.slug}`} className="block">
                  <div className="relative aspect-video w-full overflow-hidden">
                    {heroUrl ? (
                      <Image
                        src={heroUrl}
                        alt={article.hero?.alt ?? article.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-end p-3"
                        style={placeholderStyle(article.title)}
                      >
                        <span className="text-xs font-black uppercase tracking-wide text-white/70">
                          CTR Sports
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  {article.category ? (
                    <p className="text-xs font-bold uppercase tracking-wide text-accent">
                      {article.category.name}
                    </p>
                  ) : null}
                  <Link href={`/latest/${article.slug}`}>
                    <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-white transition-colors group-hover:text-accent">
                      {article.title}
                    </h3>
                  </Link>
                  <div className="mt-auto flex items-center justify-between pt-3 text-xs text-fg-faint">
                    <span className="font-semibold">
                      {article.publishedAt ? format(article.publishedAt, "d MMM yyyy") : ""}
                      <span className="mx-1.5 text-fg-faint">·</span>
                      Saved {format(createdAt, "d MMM yyyy")}
                    </span>
                    <form action={removeSavedArticle}>
                      <input type="hidden" name="articleId" value={article.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 font-bold uppercase tracking-wide text-fg-faint transition-colors hover:text-accent"
                        aria-label={`Remove ${article.title} from saved articles`}
                      >
                        <X size={13} /> Remove
                      </button>
                    </form>
                  </div>
                </div>
              </ChamferCard>
            );
          })}
        </div>
      )}
    </main>
  );
}
