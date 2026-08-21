import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { X } from "lucide-react";
import { db, savedArticles } from "@ctr/db";
import { requireFan } from "@/lib/fan-auth";
import { mediaUrl, placeholderStyle } from "@/lib/media";
import { AccountNav } from "@/components/fanzone/account-nav";
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
    <main className="bg-surface-3 pb-16">
      <AccountNav active="/account/saved" />

      <div className="f1-inner pt-8">
        <h1 className="display-xl lg:display-2xl font-black uppercase text-text-5">
          Saved articles
        </h1>
        <p className="body-xs mt-2 text-text-3">
          {saved.length} {saved.length === 1 ? "story" : "stories"} bookmarked to read later.
        </p>

        {saved.length === 0 ? (
          <div className="mt-6 rounded-md bg-surface-1 px-6 py-12 text-center md:px-8">
            <p className="display-l font-black uppercase text-text-5">Nothing saved yet</p>
            <p className="body-s mx-auto mt-2 max-w-[420px] text-text-3">
              Tap the bookmark on any story to keep it here for later.
            </p>
            <Link href="/latest" className="btn btn-md btn-brand mt-6">
              Browse the latest news
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map(({ article, createdAt }) => {
              const heroUrl = mediaUrl(article.hero?.path);
              return (
                <article
                  key={article.id}
                  className="group flex h-full flex-col overflow-clip rounded-md bg-surface-1"
                >
                  <Link href={`/latest/${article.slug}`} className="block">
                    <div className="relative aspect-video w-full overflow-clip">
                      {heroUrl ? (
                        <Image
                          src={heroUrl}
                          alt={article.hero?.alt ?? article.title}
                          fill
                          sizes="(min-width: 1069px) 33vw, (min-width: 735px) 50vw, 100vw"
                          className="card-img object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-end p-3"
                          style={placeholderStyle(article.title)}
                        >
                          <span className="display-s font-medium uppercase text-white/70">
                            CTR Sports
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col p-4">
                    {article.category ? (
                      <p className="body-2xs font-bold uppercase text-brand">
                        {article.category.name}
                      </p>
                    ) : null}
                    <Link href={`/latest/${article.slug}`}>
                      <h2 className="display-m mt-1.5 line-clamp-2 font-medium text-text-5 group-hover:underline">
                        {article.title}
                      </h2>
                    </Link>

                    <div className="body-2xs mt-auto flex items-center justify-between gap-3 pt-4 text-text-3">
                      <span className="font-semibold">
                        {article.publishedAt ? format(article.publishedAt, "d MMM yyyy") : ""}
                        <span aria-hidden className="mx-1.5">
                          ·
                        </span>
                        Saved {format(createdAt, "d MMM yyyy")}
                      </span>
                      <form action={removeSavedArticle}>
                        <input type="hidden" name="articleId" value={article.id} />
                        <button
                          type="submit"
                          className="inline-flex shrink-0 items-center gap-1 font-bold uppercase transition-colors hover:text-brand"
                          aria-label={`Remove ${article.title} from saved articles`}
                        >
                          <X size={13} aria-hidden /> Remove
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
