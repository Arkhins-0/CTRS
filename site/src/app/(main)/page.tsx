import { and, asc, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import {
  articles,
  constructorStandings,
  db,
  driverSeasonEntries,
  driverStandings,
  grandsPrix,
  TAGS,
  videos,
} from "@ctr/db";
import { ChamferCard, CountryFlag, SectionHeading, TeamColorBar } from "@ctr/ui";
import { ArticleCard } from "@/components/news/article-card";
import { Countdown } from "@/components/news/countdown";
import { HeroArticle } from "@/components/news/hero-article";
import { LocalTime } from "@/components/news/local-time";
import { VideoCard } from "@/components/news/video-card";
import { cached } from "@/lib/cache";
import { getCurrentSeasonYear } from "@/lib/settings";

const SESSION_LABELS: Record<string, string> = {
  fp1: "Practice 1",
  fp2: "Practice 2",
  fp3: "Practice 3",
  sprint_qualifying: "Sprint Qualifying",
  sprint: "Sprint",
  qualifying: "Qualifying",
  race: "Race",
};

/* ── Home data bundle (one cached() call) ────────────────────────────────── */

async function loadHome(year: number) {
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

  const [latestRaw, nextGp, driverTop, constructorTop, latestVideos] = await Promise.all([
    db.query.articles.findMany({
      where: eq(articles.status, "published"),
      orderBy: [desc(articles.publishedAt)],
      limit: 9, // one spare so the grid stays at 8 after removing the hero story
      with: { hero: true, category: true },
    }),
    db.query.grandsPrix.findFirst({
      where: eq(grandsPrix.status, "scheduled"),
      orderBy: [asc(grandsPrix.seasonYear), asc(grandsPrix.round)],
      with: {
        circuit: true,
        sessions: { orderBy: (s, { asc: sortAsc }) => [sortAsc(s.startsAt)] },
      },
    }),
    db.query.driverStandings.findMany({
      where: eq(driverStandings.seasonYear, year),
      orderBy: [asc(driverStandings.position)],
      limit: 3,
      with: { driver: true },
    }),
    db.query.constructorStandings.findMany({
      where: eq(constructorStandings.seasonYear, year),
      orderBy: [asc(constructorStandings.position)],
      limit: 3,
      with: { teamSeasonEntry: true },
    }),
    db.query.videos.findMany({
      where: eq(videos.status, "published"),
      orderBy: [desc(videos.publishedAt)],
      limit: 4,
      with: { thumbnail: true },
    }),
  ]);

  const latest = latestRaw.filter((a) => a.id !== hero?.id).slice(0, 8);

  // Team colour per top-3 driver: their latest driver entry of the season.
  const driverIds = driverTop.map((r) => r.driverId);
  const entries = driverIds.length
    ? await db.query.driverSeasonEntries.findMany({
        where: and(
          eq(driverSeasonEntries.seasonYear, year),
          inArray(driverSeasonEntries.driverId, driverIds),
        ),
        with: { teamSeasonEntry: true },
      })
    : [];
  const teamColorByDriver: Record<string, string> = {};
  for (const e of [...entries].sort((a, b) => (a.fromRound ?? 0) - (b.fromRound ?? 0))) {
    teamColorByDriver[e.driverId] = e.teamSeasonEntry.primaryColor; // latest entry wins
  }

  return { hero, latest, nextGp, driverTop, constructorTop, teamColorByDriver, latestVideos };
}

function getHomeData(year: number) {
  return cached(
    () => loadHome(year),
    ["home", String(year)],
    [TAGS.home, TAGS.articles, TAGS.standings, TAGS.schedule, TAGS.videos],
    60,
  );
}

/* ── Widgets ─────────────────────────────────────────────────────────────── */

function StandingsCard({
  title,
  year,
  href,
  rows,
}: {
  title: string;
  year: number;
  href: string;
  rows: { key: string; position: number; color: string | null; name: string; points: number }[];
}) {
  return (
    <ChamferCard className="flex flex-col bg-carbon p-5 text-white">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
        <span className="text-xs font-bold uppercase tracking-widest text-f1-grey-light">
          {year}
        </span>
      </div>

      {rows.length ? (
        <ol className="mt-4 divide-y divide-carbon-700">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-3 py-2.5">
              <span className="w-6 shrink-0 text-lg font-black italic">{r.position}</span>
              <TeamColorBar color={r.color} />
              <span className="flex-1 truncate font-bold">{r.name}</span>
              <span className="chamfer-tr shrink-0 bg-carbon-700 px-2 py-0.5 text-sm font-black tabular-nums">
                {r.points} <span className="text-[10px] font-bold text-f1-grey-light">PTS</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 flex-1 text-sm text-f1-grey-light">
          Standings will appear after the first race of the season.
        </p>
      )}

      <Link
        href={href}
        className="mt-4 inline-block text-xs font-black uppercase tracking-wide text-f1-red-bright transition-colors hover:text-white"
      >
        Full standings →
      </Link>
    </ChamferCard>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function HomePage() {
  const year = await getCurrentSeasonYear();
  const { hero, latest, nextGp, driverTop, constructorTop, teamColorByDriver, latestVideos } =
    await getHomeData(year);

  const raceSession = nextGp?.sessions.find((s) => s.type === "race");
  const countdownIso = raceSession?.startsAt
    ? new Date(raceSession.startsAt).toISOString()
    : nextGp?.startDate
      ? new Date(nextGp.startDate).toISOString()
      : null;

  return (
    <main>
      {/* a. Hero story */}
      {hero ? <HeroArticle article={hero} /> : null}

      {/* b. Next race strip */}
      {nextGp ? (
        <section className="bg-carbon-fibre text-white">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-f1-red-bright">
                  Up Next · Round {nextGp.round}
                </p>
                <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">
                  {nextGp.name}
                </h2>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-warm-grey">
                  <CountryFlag code={nextGp.circuit.countryCode} className="text-lg" />
                  <span>
                    {nextGp.circuit.name}
                    {nextGp.circuit.locality ? ` · ${nextGp.circuit.locality}` : ""},{" "}
                    {nextGp.circuit.country}
                  </span>
                </p>
                {raceSession?.startsAt ? (
                  <p className="mt-1 text-sm text-f1-grey-light">
                    Race starts{" "}
                    <LocalTime
                      iso={new Date(raceSession.startsAt).toISOString()}
                      className="font-bold text-white"
                    />
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col items-start gap-4 lg:items-end">
                {countdownIso ? <Countdown targetIso={countdownIso} /> : null}
                <Link
                  href={`/schedule/${nextGp.seasonYear}/${nextGp.slug}`}
                  className="chamfer-tr bg-f1-red px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white transition-colors hover:bg-f1-red-dark"
                >
                  Race weekend info →
                </Link>
              </div>
            </div>

            {nextGp.sessions.length ? (
              <ul className="mt-8 grid grid-cols-2 gap-3 border-t border-carbon-700 pt-6 sm:grid-cols-3 lg:grid-cols-6">
                {nextGp.sessions.map((s) => (
                  <li key={s.id} className="chamfer-tr bg-carbon-800/80 px-3 py-2">
                    <p className="text-[11px] font-black uppercase tracking-wide text-f1-grey-light">
                      {SESSION_LABELS[s.type] ?? s.type}
                    </p>
                    <p className="mt-0.5 text-sm font-bold">
                      {s.startsAt ? (
                        <LocalTime iso={new Date(s.startsAt).toISOString()} />
                      ) : (
                        "Time TBC"
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10">
        {/* c. Latest news */}
        <section>
          <SectionHeading
            right={
              <Link href="/latest" className="text-f1-red transition-colors hover:text-carbon">
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
            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-f1-grey">
              No stories published yet — the season is just warming up.
            </p>
          )}
        </section>

        {/* d. Standings widgets */}
        <section className="grid gap-6 md:grid-cols-2">
          <StandingsCard
            title="Drivers' Standings"
            year={year}
            href={`/standings/${year}/drivers`}
            rows={driverTop.map((r) => ({
              key: r.driverId,
              position: r.position,
              color: teamColorByDriver[r.driverId] ?? null,
              name: `${r.driver.firstName} ${r.driver.lastName}`,
              points: r.points,
            }))}
          />
          <StandingsCard
            title="Constructors' Standings"
            year={year}
            href={`/standings/${year}/constructors`}
            rows={constructorTop.map((r) => ({
              key: r.teamSeasonEntryId,
              position: r.position,
              color: r.teamSeasonEntry.primaryColor,
              name: r.teamSeasonEntry.shortName,
              points: r.points,
            }))}
          />
        </section>

        {/* e. Video row */}
        {latestVideos.length ? (
          <section>
            <SectionHeading
              right={
                <Link href="/video" className="text-f1-red transition-colors hover:text-carbon">
                  More videos →
                </Link>
              }
            >
              Latest Videos
            </SectionHeading>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {latestVideos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </section>
        ) : null}

        {/* f. Fan zone teaser */}
        <section>
          <ChamferCard corner="tr-lg" className="bg-carbon-fibre px-6 py-8 text-white sm:px-10">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-f1-red-bright">
                  Fan Zone
                </p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight">
                  Get closer to the action
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/polls"
                  className="chamfer-tr bg-f1-red px-5 py-2.5 text-xs font-black uppercase tracking-wide transition-colors hover:bg-f1-red-dark"
                >
                  Vote in this week&apos;s poll
                </Link>
                <Link
                  href="/register"
                  className="chamfer-tr border border-white/40 px-5 py-2.5 text-xs font-black uppercase tracking-wide transition-colors hover:border-white hover:bg-white hover:text-carbon"
                >
                  Create your free fan account
                </Link>
              </div>
            </div>
          </ChamferCard>
        </section>
      </div>
    </main>
  );
}
