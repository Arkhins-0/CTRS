import Image from "next/image";
import Link from "next/link";
import { mediaUrl, placeholderStyle } from "@/lib/media";
import type { ArticleCardData } from "./article-card";

/** Full-bleed dark homepage hero for the lead story. */
export function HeroArticle({ article }: { article: ArticleCardData }) {
  const img = mediaUrl(article.hero?.path);

  return (
    <section className="relative overflow-hidden bg-page text-white">
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
        <div className="absolute inset-0 bg-gradient-to-t from-page via-page/60 to-page/10" />
      </div>

      <Link href={`/latest/article/${article.slug}`} className="group relative block">
        <div className="mx-auto flex min-h-[420px] max-w-7xl flex-col justify-end px-4 pb-10 pt-28 md:min-h-[560px]">
          <div className="flex flex-wrap items-center gap-2">
            {article.isBreaking ? (
              <span
                className="chamfer-tr inline-flex items-center bg-white px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-page"
                style={{ ["--chamfer" as string]: "6px" }}
              >
                Breaking
              </span>
            ) : null}
            {article.category ? (
              <span
                className="chamfer-tr inline-flex items-center bg-accent px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-accent-fg"
                style={{ ["--chamfer" as string]: "6px" }}
              >
                {article.category.name}
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 max-w-4xl text-3xl font-black uppercase leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {article.title}
          </h1>
          {article.standfirst ? (
            <p className="mt-3 line-clamp-3 max-w-2xl text-base text-fg-muted sm:text-lg">
              {article.standfirst}
            </p>
          ) : null}
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-accent transition-colors group-hover:text-white">
            Read more
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>
      </Link>
    </section>
  );
}
