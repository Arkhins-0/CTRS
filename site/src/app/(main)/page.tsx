import { and, asc, desc, eq } from "drizzle-orm";
import { articles, db, TAGS, videos } from "@ctr/db";
import { EditorsPicksBand } from "@/components/home/editors-picks";
import { HeroBand } from "@/components/home/hero-band";
import { NextGpPromo, SeasonStandingsBand } from "@/components/home/season-bundle";
import { VideoRailBand } from "@/components/home/video-rail";
import {
  getCategories,
  getDriverStandingsForSeason,
  getDriversByCategory,
  getScheduleForSeason,
} from "@/components/racing/data";
import { cached } from "@/lib/cache";
import { getCurrentSeasonYear } from "@/lib/settings";

/* ── Editorial bundle ────────────────────────────────────────────────────────
   One cached read for every article/video band on the page: a lead story
   (breaking wins, else newest), then enough follow-ups to fill the hero's
   featured 4-pack, its right rail and the editor's-picks grid. ───────────── */

const HERO_FEATURED = 4;
const HERO_RAIL = 4;
const PICKS = 6;

function getHomeEditorial() {
  return cached(
    async () => {
      const breaking = await db.query.articles.findFirst({
        where: and(eq(articles.status, "published"), eq(articles.isBreaking, true)),
        orderBy: [desc(articles.publishedAt)],
        with: { hero: true, category: true },
      });
      const [pool, videoRows] = await Promise.all([
        db.query.articles.findMany({
          where: eq(articles.status, "published"),
          orderBy: [desc(articles.publishedAt)],
          limit: 1 + HERO_FEATURED + HERO_RAIL + PICKS,
          with: { hero: true, category: true },
        }),
        db.query.videos.findMany({
          where: eq(videos.status, "published"),
          orderBy: [desc(videos.publishedAt)],
          limit: 8,
          with: { thumbnail: true },
        }),
      ]);

      const lead = breaking ?? pool[0] ?? null;
      const rest = pool.filter((a) => a.id !== lead?.id);

      return {
        lead,
        featured: rest.slice(0, HERO_FEATURED),
        rail: rest.slice(HERO_FEATURED, HERO_FEATURED + HERO_RAIL),
        picks: rest.slice(HERO_FEATURED + HERO_RAIL),
        videos: videoRows,
      };
    },
    ["home-editorial"],
    [TAGS.home, TAGS.articles, TAGS.videos],
    60,
  );
}

/* ── Season bundle ───────────────────────────────────────────────────────────
   Standings of the flagship category once anything has been scored; before
   that the next race weekend takes the slot. ─────────────────────────────── */

async function getSeasonBundle(year: number) {
  const [categories, schedule] = await Promise.all([
    getCategories(),
    getScheduleForSeason(year),
  ]);
  const flagship = categories[0] ?? null;

  const standings = flagship
    ? await getDriverStandingsForSeason(year, flagship.id)
    : { computedThroughRound: 0, rows: [] };

  // Podium cards want headshots, which the standings rows do not carry.
  const headshotBySlug: Record<string, string | null> = {};
  if (standings.rows.length) {
    const groups = await getDriversByCategory(year);
    for (const group of groups) {
      for (const d of group.drivers) headshotBySlug[d.slug] = d.headshotPath;
    }
  }

  const nextGp =
    schedule.find((g) => g.status === "live") ??
    schedule.find((g) => g.status === "scheduled") ??
    null;

  return { flagship, standings, headshotBySlug, nextGp };
}

export default async function HomePage() {
  const year = await getCurrentSeasonYear();
  const [editorial, season] = await Promise.all([getHomeEditorial(), getSeasonBundle(year)]);

  const { flagship, standings, headshotBySlug, nextGp } = season;
  const scored = standings.computedThroughRound > 0 && standings.rows.length > 0;
  const liveLabel = nextGp?.status === "live" ? nextGp.name : null;

  return (
    <main>
      <HeroBand
        year={year}
        lead={editorial.lead}
        featured={editorial.featured}
        rail={editorial.rail}
        live={liveLabel}
      />

      <VideoRailBand title="Must watch" videos={editorial.videos} />

      <EditorsPicksBand articles={editorial.picks} title="Editor's picks" />

      {scored && flagship ? (
        <SeasonStandingsBand
          year={year}
          categoryName={flagship.name}
          rows={standings.rows}
          headshotBySlug={headshotBySlug}
          note={
            standings.computedThroughRound > 0
              ? `After Round ${standings.computedThroughRound}`
              : null
          }
        />
      ) : nextGp ? (
        <NextGpPromo year={year} gp={nextGp} />
      ) : null}
    </main>
  );
}
