import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@ctr/ui";
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

/** F1.com-style news card: image (or gradient), category chip, title, standfirst. */
export function ArticleCard({ article }: { article: ArticleCardData }) {
  const img = mediaUrl(article.hero?.path);

  return (
    <Link href={`/latest/article/${article.slug}`} className="group block h-full">
      <article className="chamfer-tr flex h-full flex-col overflow-hidden border border-warm-grey bg-white transition-transform duration-200 group-hover:-translate-y-1">
        <div className="relative aspect-video w-full overflow-hidden bg-carbon">
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
            {article.isBreaking ? <Badge tone="red">Breaking</Badge> : null}
            {article.category ? <Badge tone="grey">{article.category.name}</Badge> : null}
          </div>
          <h3 className="text-base font-black uppercase leading-snug tracking-tight text-carbon transition-colors group-hover:text-f1-red">
            {article.title}
          </h3>
          {article.standfirst ? (
            <p className="line-clamp-2 text-sm text-f1-grey">{article.standfirst}</p>
          ) : null}
          {article.publishedAt ? (
            <p className="mt-auto pt-1 text-xs font-semibold uppercase tracking-wide text-f1-grey-light">
              {format(new Date(article.publishedAt), "d MMM yyyy")}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
