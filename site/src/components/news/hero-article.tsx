import Image from "next/image";
import Link from "next/link";
import { Badge } from "@ctr/ui";
import { mediaUrl, placeholderStyle } from "@/lib/media";
import type { ArticleCardData } from "./article-card";

/** Full-width dark homepage hero for the lead story. */
export function HeroArticle({ article }: { article: ArticleCardData }) {
  const img = mediaUrl(article.hero?.path);

  return (
    <section className="relative overflow-hidden bg-carbon text-white">
      <div className="absolute inset-0">
        {img ? (
          <Image
            src={img}
            alt={article.hero?.alt ?? article.title}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-60"
          />
        ) : (
          <div className="h-full w-full" style={placeholderStyle(article.title)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/60 to-carbon/10" />
      </div>

      <Link href={`/latest/article/${article.slug}`} className="group relative block">
        <div className="mx-auto flex min-h-[420px] max-w-7xl flex-col justify-end px-4 pb-10 pt-28 md:min-h-[520px]">
          <div className="flex flex-wrap items-center gap-2">
            {article.isBreaking ? <Badge tone="red">Breaking</Badge> : null}
            {article.category ? <Badge tone="dark">{article.category.name}</Badge> : null}
          </div>
          <h1 className="mt-3 max-w-4xl text-3xl font-black uppercase leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {article.title}
          </h1>
          {article.standfirst ? (
            <p className="mt-3 line-clamp-3 max-w-2xl text-base text-warm-grey sm:text-lg">
              {article.standfirst}
            </p>
          ) : null}
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-f1-red transition-colors group-hover:text-white">
            Read the full story
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>
      </Link>
    </section>
  );
}
