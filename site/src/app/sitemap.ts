import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import {
  articles,
  championshipSeasons,
  db,
  drivers,
  pages,
  rounds,
  teams,
  videos,
} from "@ctr/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3001";

  const staticPaths = [
    "",
    "/latest",
    "/video",
    "/schedule",
    "/drivers",
    "/teams",
    "/polls",
  ].map((p) => ({ url: `${base}${p}` }));

  const [articleRows, videoRows, gpRows, driverRows, teamRows, pageRows] = await Promise.all([
    db
      .select({ slug: articles.slug, updatedAt: articles.updatedAt })
      .from(articles)
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.publishedAt))
      .limit(500),
    db.select({ slug: videos.slug }).from(videos).where(eq(videos.status, "published")).limit(200),
    db
      .select({ slug: rounds.slug, seasonYear: championshipSeasons.year })
      .from(rounds)
      .innerJoin(championshipSeasons, eq(rounds.championshipSeasonId, championshipSeasons.id)),
    db.select({ slug: drivers.slug }).from(drivers),
    db.select({ slug: teams.slug }).from(teams),
    db.select({ slug: pages.slug }).from(pages).where(eq(pages.status, "published")),
  ]);

  return [
    ...staticPaths,
    ...articleRows.map((a) => ({ url: `${base}/latest/article/${a.slug}`, lastModified: a.updatedAt })),
    ...videoRows.map((v) => ({ url: `${base}/video/${v.slug}` })),
    ...gpRows.map((g) => ({ url: `${base}/schedule/${g.seasonYear}/${g.slug}` })),
    ...driverRows.map((d) => ({ url: `${base}/drivers/${d.slug}` })),
    ...teamRows.map((t) => ({ url: `${base}/teams/${t.slug}` })),
    ...pageRows.map((p) => ({ url: `${base}/${p.slug}` })),
  ];
}
