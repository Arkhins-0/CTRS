import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { mediaUrl, placeholderStyle } from "@/lib/media";

export type ArticleCardData = {
  slug: string;
  title: string;
  standfirst: string | null;
  publishedAt: Date | string | null;
  isBreaking?: boolean;
  hero?: { path: string; alt: string | null } | null;
  category?: { slug: string; name: string } | null;
};

/** Dark F1.com-style news card: image (or gradient), accent category chip, title, standfirst. */
export function ArticleCard({ article }: { article: ArticleCardData }) {
  const img = mediaUrl(article.hero?.path);

  return (
    <Link href={`/latest/article/${article.slug}`} className="group block h-full">
      <article className="chamfer-tr flex h-full flex-col overflow-hidden border border-line bg-surface transition-transform duration-200 group-hover:-translate-y-1">
        <div className="relative aspect-video w-full overflow-hidden bg-panel">
          {img ? (
            <Image
              src={img}
              alt={article.hero?.alt ?? article.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full w-full items-end p-3"
              style={placeholderStyle(article.title)}
            >
              <span className="text-xs font-black uppercase tracking-[0.25em] text-white/60">
                CTR Sports
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
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
          <h3 className="text-base font-black uppercase leading-snug tracking-tight text-white transition-colors group-hover:text-accent">
            {article.title}
          </h3>
          {article.standfirst ? (
            <p className="line-clamp-2 text-sm text-fg-muted">{article.standfirst}</p>
          ) : null}
          {article.publishedAt ? (
            <p className="mt-auto pt-1 text-xs font-semibold uppercase tracking-wide text-fg-faint">
              {format(new Date(article.publishedAt), "d MMM yyyy")}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
