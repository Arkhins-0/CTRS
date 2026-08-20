import { format, isSameMonth } from "date-fns";
import { and, asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import {
  articles,
  championships,
  championshipSeasons,
  circuits,
  db,
  raceCategories,
  rounds,
  sponsors,
  TAGS,
} from "@ctr/db";
import { ChamferCard, CountryFlag, SectionHeading } from "@ctr/ui";
import { ArticleCard } from "@/components/news/article-card";
import { Countdown } from "@/components/news/countdown";
import { HeroArticle } from "@/components/news/hero-article";
import { HOME_CHAMPIONSHIP } from "@/components/racing/data";
import { cached } from "@/lib/cache";
import { mediaUrl } from "@/lib/media";
import { getCurrentSeasonYear } from "@/lib/settings";

/* ── Home data bundles ───────────────────────────────────────────────────── */

/** Next scheduled round of the home championship (earliest year, then round). */
async function loadNextRound() {
  const [next] = await db
    .select({
      id: rounds.id,
      round: rounds.round,
      slug: rounds.slug,
      name: rounds.name,
      startDate: rounds.startDate,
      endDate: rounds.endDate,
      seasonYear: championshipSeasons.year,
      circuit: {
        name: circuits.name,
        locality: circuits.locality,
        country: circuits.country,
        countryCode: circuits.countryCode,
      },
    })
    .from(rounds)
    .innerJoin(championshipSeasons, eq(rounds.championshipSeasonId, championshipSeasons.id))
    .innerJoin(championships, eq(championshipSeasons.championshipId, championships.id))
    .innerJoin(circuits, eq(rounds.circuitId, circuits.id))
    .where(and(eq(championships.slug, HOME_CHAMPIONSHIP), eq(rounds.status, "scheduled")))
    .orderBy(asc(championshipSeasons.year), asc(rounds.round))
    .limit(1);
  if (!next) return null;

  const sessions = await db.query.raceSessions.findMany({
    columns: { id: true, startsAt: true },
    where: (s, { eq: whereEq }) => whereEq(s.roundId, next.id),
    orderBy: (s, { asc: sortAsc }) => [sortAsc(s.startsAt)],
  });

  return { ...next, sessions };
}

async function loadHome() {
  // Hero: latest breaking story, else newest published article.
  const breaking = await db.query.articles.findFirst({
    where: and(eq(articles.status, "published"), eq(articles.isBreaking, true)),
    orderBy: [desc(articles.publishedAt)],
    with: { hero: true, category: true },
  });
  const hero =
    breaking ??
    (await db.query.articles.findFirst({
      where: eq(articles.status, "published"),
      orderBy: [desc(articles.publishedAt)],
      with: { hero: true, category: true },
    }));

  const [latestRaw, nextGp, titlePartners] = await Promise.all([
    db.query.articles.findMany({
      where: eq(articles.status, "published"),
      orderBy: [desc(articles.publishedAt)],
      limit: 9, // one spare so the grid stays at 8 after removing the hero story
      with: { hero: true, category: true },
    }),
    loadNextRound(),
    db.query.sponsors.findMany({
      where: and(eq(sponsors.isActive, true), eq(sponsors.tier, "global_partner")),
      orderBy: [asc(sponsors.sort)],
      with: { logo: true },
    }),
  ]);

  const latest = latestRaw.filter((a) => a.id !== hero?.id).slice(0, 8);

  return { hero, latest, nextGp, titlePartners };
}

function getHomeData() {
  return cached(
    () => loadHome(),
    ["home"],
    [TAGS.home, TAGS.articles, TAGS.schedule, TAGS.sponsors],
    60,
  );
}

function getHomeCategories() {
  return cached(
    () =>
      db.query.raceCategories.findMany({
        where: eq(raceCategories.isActive, true),
        orderBy: [asc(raceCategories.sort)],
      }),
    ["home-race-categories"],
    [TAGS.categories],
  );
}

/* ── Small pieces ────────────────────────────────────────────────────────── */

function roundDates(start: Date | string, end: Date | string): string {
  const s = new Date(start);
  const e = new Date(end);
  return isSameMonth(s, e)
    ? `${format(s, "d")}–${format(e, "d MMM yyyy")}`
    : `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`;
}

const STATS = [
  { value: "7", label: "Racing categories" },
  { value: "4", label: "Championship rounds" },
  { value: "3", label: "Iconic circuits" },
  { value: "2026", label: "Inaugural season" },
];

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function HomePage() {
  const year = await getCurrentSeasonYear();
  const [{ hero, latest, nextGp, titlePartners }, categories] = await Promise.all([
    getHomeData(),
    getHomeCategories(),
  ]);

  const firstSession = nextGp?.sessions.find((s) => s.startsAt);
  const countdownIso = firstSession?.startsAt
    ? new Date(firstSession.startsAt).toISOString()
    : nextGp?.startDate
      ? new Date(nextGp.startDate).toISOString()
      : null;

  return (
    <main>
      {/* a. Hero story */}
      {hero ? <HeroArticle article={hero} /> : null}

      {/* b. Next race band */}
      {nextGp ? (
        <section className="border-y border-line bg-carbon-fibre text-white">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p
                  className="chamfer-tr inline-flex bg-accent px-2.5 py-1 text-xs font-black uppercase tracking-[0.3em] text-accent-fg"
                  style={{ ["--chamfer" as string]: "6px" }}
                >
                  Up Next · Round {nextGp.round}
                </p>
                <h2 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl">
                  {nextGp.name}
                </h2>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-fg-muted">
                  <CountryFlag code={nextGp.circuit.countryCode} className="text-lg" />
                  <span>
                    {nextGp.circuit.name}
                    {nextGp.circuit.locality ? ` · ${nextGp.circuit.locality}` : ""},{" "}
                    {nextGp.circuit.country}
                  </span>
                </p>
                {nextGp.startDate && nextGp.endDate ? (
                  <p className="mt-1 text-sm font-bold uppercase tracking-wide text-fg-faint">
                    {roundDates(nextGp.startDate, nextGp.endDate)}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col items-start gap-4 lg:items-end">
                {countdownIso ? <Countdown targetIso={countdownIso} /> : null}
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/schedule/${nextGp.seasonYear}/${nextGp.slug}`}
                    className="chamfer-tr border border-line bg-panel px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white transition-colors hover:border-accent hover:text-accent"
                  >
                    Race weekend info →
                  </Link>
                  <Link
                    href="/tickets"
                    className="chamfer-tr bg-accent px-5 py-2.5 text-xs font-black uppercase tracking-wide text-accent-fg transition-colors hover:bg-accent-dark"
                  >
                    Get tickets
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* c. Categories showcase — the signature CTR block */}
      {categories.length ? (
        <section className="bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-14">
            <SectionHeading className="[&_h2]:border-accent [&_h2]:text-white">
              Seven racing categories
            </SectionHeading>
            <p className="mt-4 max-w-3xl text-base text-fg-muted">
              A single grid for the whole country — from Formula 4 to saloons, hatchbacks and
              touring cars, under one national banner.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((c) => (
                <Link key={c.id} href="/drivers" className="group block h-full">
                  <div
                    className="flex h-full flex-col border border-line border-t-4 bg-panel p-4 transition-transform duration-200 group-hover:-translate-y-1"
                    style={{ borderTopColor: c.color }}
                  >
                    <p className="text-2xl font-black uppercase italic tracking-tight text-white">
                      {c.shortName}
                    </p>
                    <p className="mt-1 text-sm font-bold uppercase tracking-wide text-fg-muted transition-colors group-hover:text-accent">
                      {c.name}
                    </p>
                    {c.carSpec ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-fg-faint">
                        {c.carSpec}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10">
        {/* d. Latest news */}
        <section>
          <SectionHeading
            className="[&_h2]:border-accent [&_h2]:text-white"
            right={
              <Link href="/latest" className="text-accent transition-colors hover:text-white">
                View all →
              </Link>
            }
          >
            Latest News
          </SectionHeading>
          {latest.length ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {latest.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-fg-faint">
              No stories published yet — the season is just warming up.
            </p>
          )}
        </section>

        {/* e. Championship stats strip */}
        <section>
          <div className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-surface px-6 py-8 text-center">
                <p className="text-4xl font-black italic tabular-nums text-accent sm:text-5xl">
                  {s.value}
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-fg-muted">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* f. Partners row */}
        <section>
          <SectionHeading
            className="[&_h2]:border-accent [&_h2]:text-white"
            right={
              <Link href="/partners" className="text-accent transition-colors hover:text-white">
                All partners →
              </Link>
            }
          >
            Behind the grid — a landmark partnership
          </SectionHeading>
          <ul className="mt-6 flex flex-wrap items-stretch gap-4">
            <li>
              <Link
                href="/partners"
                className="chamfer-tr flex h-full min-w-[160px] items-center justify-center gap-2 border border-line bg-surface px-8 py-6 transition-colors hover:border-accent"
              >
                <span className="chamfer-tr bg-accent px-2 py-0.5 text-base font-black uppercase italic leading-none text-accent-fg">
                  CTR
                </span>
                <span className="text-base font-black uppercase tracking-wider text-white">
                  Unified
                </span>
              </Link>
            </li>
            {titlePartners.map((p) => {
              const logo = mediaUrl(p.logo?.path);
              return (
                <li key={p.id}>
                  <Link
                    href="/partners"
                    className="chamfer-tr flex h-full min-w-[160px] items-center justify-center border border-line bg-surface px-8 py-6 transition-colors hover:border-accent"
                  >
                    {logo ? (
                      // Partner logos have unknown dimensions — plain <img> by design
                      <img src={logo} alt={p.name} className="h-12 w-auto object-contain" />
                    ) : (
                      <span className="text-lg font-black uppercase tracking-wider text-white">
                        {p.name}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* g. Register band */}
        <section>
          <ChamferCard corner="tr-lg" className="border border-line bg-carbon-fibre px-6 py-10 text-white sm:px-10">
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">
                  {year} season · registration open
                </p>
                <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">
                  Race with CTR
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted sm:text-base">
                  Seven categories. Four national rounds on India&apos;s best circuits. Whether it
                  is your first race or your next championship, there is a grid here for you.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://chennaiturboriders.in/IndianNationalCarRacingChampionship/registration"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chamfer-tr bg-accent px-6 py-3 text-xs font-black uppercase tracking-wide text-accent-fg transition-colors hover:bg-accent-dark"
                >
                  Register now
                </a>
                <Link
                  href="/register"
                  className="chamfer-tr border border-line px-6 py-3 text-xs font-black uppercase tracking-wide text-white transition-colors hover:border-accent hover:text-accent"
                >
                  Fan zone
                </Link>
              </div>
            </div>
          </ChamferCard>
        </section>
      </div>
    </main>
  );
}
