import { eq, or } from "drizzle-orm";
import {
  adminUsers,
  articles,
  cars,
  championships,
  championshipSeasons,
  circuits,
  db,
  drivers,
  galleries,
  galleryItems,
  pages,
  rounds,
  sponsors,
  teamSeasonEntries,
  teams,
  videos,
} from "@ctr/db";

export type MediaUsage = { type: string; name: string; href: string };

/**
 * Every place a media row can be referenced — used for the "where is this
 * used?" list and as the guard before deletion. Keep in sync with the schema:
 * any new *MediaId column must be added here.
 */
export async function findMediaUsage(mediaId: string): Promise<MediaUsage[]> {
  const [
    articleRows,
    championshipRows,
    teamRows,
    entryRows,
    carRows,
    driverRows,
    circuitRows,
    roundRows,
    videoRows,
    galleryRows,
    pageRows,
    sponsorRows,
    adminRows,
  ] = await Promise.all([
    db
      .select({ id: articles.id, title: articles.title })
      .from(articles)
      .where(eq(articles.heroMediaId, mediaId)),
    db
      .select({ id: championships.id, name: championships.name })
      .from(championships)
      .where(eq(championships.logoMediaId, mediaId)),
    db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.logoMediaId, mediaId)),
    db
      .select({
        id: teamSeasonEntries.id,
        name: teamSeasonEntries.displayName,
        year: championshipSeasons.year,
      })
      .from(teamSeasonEntries)
      .innerJoin(
        championshipSeasons,
        eq(teamSeasonEntries.championshipSeasonId, championshipSeasons.id),
      )
      .where(
        or(
          eq(teamSeasonEntries.logoMediaId, mediaId),
          eq(teamSeasonEntries.carImageMediaId, mediaId),
        ),
      ),
    db
      .select({ id: cars.id, name: cars.modelName })
      .from(cars)
      .where(eq(cars.imageMediaId, mediaId)),
    db
      .select({ id: drivers.id, first: drivers.firstName, last: drivers.lastName })
      .from(drivers)
      .where(eq(drivers.headshotMediaId, mediaId)),
    db
      .select({ id: circuits.id, name: circuits.name })
      .from(circuits)
      .where(eq(circuits.mapMediaId, mediaId)),
    db
      .select({ id: rounds.id, name: rounds.name, year: championshipSeasons.year })
      .from(rounds)
      .innerJoin(championshipSeasons, eq(rounds.championshipSeasonId, championshipSeasons.id))
      .where(eq(rounds.heroMediaId, mediaId)),
    db
      .select({ id: videos.id, title: videos.title })
      .from(videos)
      .where(or(eq(videos.mediaId, mediaId), eq(videos.thumbnailMediaId, mediaId))),
    db
      .select({ id: galleries.id, title: galleries.title })
      .from(galleryItems)
      .innerJoin(galleries, eq(galleries.id, galleryItems.galleryId))
      .where(eq(galleryItems.mediaId, mediaId)),
    db
      .select({ id: pages.id, title: pages.title })
      .from(pages)
      .where(eq(pages.ogMediaId, mediaId)),
    db
      .select({ id: sponsors.id, name: sponsors.name })
      .from(sponsors)
      .where(eq(sponsors.logoMediaId, mediaId)),
    db
      .select({ id: adminUsers.id, name: adminUsers.displayName })
      .from(adminUsers)
      .where(eq(adminUsers.avatarMediaId, mediaId)),
  ]);

  return [
    ...articleRows.map((r) => ({ type: "Article", name: r.title, href: `/news/${r.id}` })),
    ...championshipRows.map((r) => ({
      type: "Championship logo",
      name: r.name,
      href: `/championships/${r.id}`,
    })),
    ...teamRows.map((r) => ({ type: "Team logo", name: r.name, href: "/teams" })),
    ...entryRows.map((r) => ({
      type: "Team season entry",
      name: `${r.name} (${r.year})`,
      href: "/teams",
    })),
    ...carRows.map((r) => ({ type: "Car image", name: r.name, href: "/teams" })),
    ...driverRows.map((r) => ({
      type: "Driver headshot",
      name: `${r.first} ${r.last}`,
      href: "/drivers",
    })),
    ...circuitRows.map((r) => ({ type: "Circuit map", name: r.name, href: "/circuits" })),
    ...roundRows.map((r) => ({
      type: "Round hero",
      name: `${r.name} ${r.year}`,
      href: `/races/${r.id}`,
    })),
    ...videoRows.map((r) => ({ type: "Video", name: r.title, href: `/videos/${r.id}` })),
    ...galleryRows.map((r) => ({ type: "Gallery", name: r.title, href: `/galleries/${r.id}` })),
    ...pageRows.map((r) => ({ type: "Page OG image", name: r.title, href: "/pages" })),
    ...sponsorRows.map((r) => ({ type: "Sponsor logo", name: r.name, href: "/sponsors" })),
    ...adminRows.map((r) => ({ type: "Admin avatar", name: r.name, href: "/admins" })),
  ];
}
