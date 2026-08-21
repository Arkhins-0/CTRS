import Link from "next/link";
import {
  CalendarDays,
  Flag,
  Newspaper,
  PlayCircle,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";
import {
  type ArticleCardData,
  FeaturedArticleCard,
  ThumbRowArticle,
} from "@/components/news/article-card";
import { HeroArticle } from "@/components/news/hero-article";

/* ── Band 1 · dark hero block ──────────────────────────────────────────────
   Quick-link chip strip over a three-part grid: the lead story as a big
   overlay card, a 4-pack of featured cards beside it, and a right rail of
   48px thumbnail rows. Everything degrades — with no lead story the band
   renders nothing at all. ─────────────────────────────────────────────────── */

const CHIP_ICONS = {
  news: Newspaper,
  video: PlayCircle,
  schedule: CalendarDays,
  results: Flag,
  standings: Trophy,
  drivers: Users,
  teams: Wrench,
} as const;

function QuickLinks({ year }: { year: number }) {
  const chips: { key: keyof typeof CHIP_ICONS; label: string; href: string }[] = [
    { key: "news", label: "News", href: "/latest" },
    { key: "video", label: "Videos", href: "/video" },
    { key: "schedule", label: "Schedule", href: `/schedule/${year}` },
    { key: "results", label: "Results", href: `/results/${year}` },
    { key: "standings", label: "Standings", href: `/standings/${year}/drivers` },
    { key: "drivers", label: "Drivers", href: "/drivers" },
    { key: "teams", label: "Teams", href: "/teams" },
  ];

  return (
    <nav aria-label="Quick links" className="-mx-1 overflow-x-auto px-1 py-1 scrollbar-none">
      <ul className="flex items-center gap-4">
        {chips.map((chip) => {
          const Icon = CHIP_ICONS[chip.key];
          return (
            <li key={chip.href} className="shrink-0 whitespace-nowrap">
              <Link
                href={chip.href}
                className="body-xs inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 font-bold text-white transition-colors hover:bg-white/20"
              >
                <Icon size={16} aria-hidden />
                {chip.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function HeroBand({
  year,
  lead,
  featured,
  rail,
  live = null,
}: {
  year: number;
  lead: ArticleCardData | null;
  featured: ArticleCardData[];
  rail: ArticleCardData[];
  /** Label for the LIVE tag on the lead card (a race weekend in progress). */
  live?: string | null;
}) {
  if (!lead) return null;

  return (
    <section className="dark-section bg-surface-3">
      <div className="f1-inner flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <QuickLinks year={year} />

        <div className="grid gap-4 md:gap-6 min-[1280px]:grid-cols-[4fr_1fr]">
          {/* Lead story + featured 4-pack */}
          <div className="grid gap-4 md:gap-6 min-[856px]:grid-cols-[minmax(0,1.5fr)_1fr] min-[1280px]:grid-cols-[minmax(0,1.7fr)_1fr]">
            <HeroArticle article={lead} live={live} />

            {featured.length ? (
              <ul className="grid auto-rows-max grid-cols-2 gap-2 md:gap-4 min-[640px]:grid-cols-4 min-[856px]:grid-cols-2">
                {featured.map((a) => (
                  <li key={a.slug}>
                    <FeaturedArticleCard article={a} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* More news rail */}
          {rail.length ? (
            <ul className="grid auto-rows-max grid-cols-1 gap-2 md:gap-4 min-[640px]:grid-cols-2 min-[856px]:grid-cols-4 min-[1280px]:grid-cols-1">
              {rail.map((a) => (
                <li key={a.slug}>
                  <ThumbRowArticle article={a} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
