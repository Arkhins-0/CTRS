/**
 * Mock-data top-up — fills every gap the main seed leaves behind so no
 * surface of the site renders an empty slot. Idempotent and re-runnable:
 * every step skips rows that already have the thing it would create, so it
 * can be run after `npm run seed` or on its own at any time.
 *
 * IMAGES: CTR holds no driver photography, no team logo artwork and no
 * artwork for most partners, so those are GENERATED here — flat vector
 * portraits and marks drawn from each entity's own colour, exported as WebP
 * with a real alpha channel (the driver portraits are cut out, which is what
 * the podium/driver cards expect). They are honest placeholders, not
 * photographs; replace them through the admin media library when real
 * artwork exists and nothing here needs to change.
 *
 * Everything that CAN come from real artwork does: video thumbnails, gallery
 * images and article heroes are pulled from the existing CTR photo library
 * (ASSET_SOURCE_DIR), never generated.
 *
 * RESULTS are deliberately NOT invented by default — see simulateResults().
 */
import "./load-env";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, pool } from "../client";
import { computeStandings } from "../points";
import {
  adminNotificationPrefs,
  adminUsers,
  articleRelated,
  articles,
  drivers,
  driverSeasonEntries,
  fanFavourites,
  fans,
  galleries,
  galleryItems,
  media,
  raceSessions,
  rounds,
  roundRsvps,
  savedArticles,
  sessionResults,
  sponsors,
  tags,
  teams,
  teamSeasonEntries,
  videos,
  videoTags,
} from "../schema";
import { ASSET_SOURCE_DIR } from "./ctr-data";
import { driverPortraitSvg, markSvg, pick, wordmarkSvg } from "./mock-art";

/* ── S3 plumbing (same contract as seedAssets in seed-ctr.ts) ────────────── */

const VARIANT_WIDTHS = { hero: 1600, card: 800, thumb: 320 } as const;
const WEBP_QUALITY = 82;

function variantKey(path: string, variant: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? `${path}_${variant}` : `${path.slice(0, dot)}_${variant}${path.slice(dot)}`;
}

const bucket = process.env.S3_BUCKET;
const hasS3 = Boolean(bucket && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
const s3 = hasS3
  ? new S3Client({
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    })
  : null;

/**
 * Uploads an image plus its three renditions and returns the media id.
 * Keyed on filename, so a re-run reuses the row instead of duplicating it.
 * `alpha` keeps transparency through the rendition pass (driver cut-outs).
 */
async function putImage(opts: {
  key: string;
  filename: string;
  body: Buffer;
  alt: string;
  credit?: string;
  alpha?: boolean;
}): Promise<string | null> {
  const existing = await db.select().from(media).where(eq(media.filename, opts.filename));
  if (existing[0]) return existing[0].id;
  if (!s3 || !bucket) return null;

  const key = `media/mock/${opts.key}.webp`;
  const put = (k: string, b: Buffer) =>
    s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: k,
        Body: b,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

  await put(key, opts.body);
  for (const [variant, width] of Object.entries(VARIANT_WIDTHS)) {
    const rendition = await sharp(opts.body)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, alphaQuality: opts.alpha ? 100 : 80 })
      .toBuffer();
    await put(variantKey(key, variant), rendition);
  }

  const meta = await sharp(opts.body).metadata();
  const [row] = await db
    .insert(media)
    .values({
      kind: "image",
      path: key,
      filename: opts.filename,
      mime: "image/webp",
      width: meta.width ?? null,
      height: meta.height ?? null,
      sizeBytes: opts.body.byteLength,
      alt: opts.alt,
      credit: opts.credit ?? "CTR (placeholder artwork)",
    })
    .returning({ id: media.id });
  return row.id;
}

/** Uploads a real photo from the CTR photo library, if the file is there. */
async function putPhoto(relPath: string, key: string, alt: string): Promise<string | null> {
  const file = resolve(ASSET_SOURCE_DIR, relPath);
  if (!existsSync(file)) return null;
  const body = await sharp(readFileSync(file)).webp({ quality: WEBP_QUALITY }).toBuffer();
  return putImage({ key, filename: `ctr-mock-${key}.webp`, body, alt, credit: "CTR" });
}

const toWebp = (svg: string, alpha = false) =>
  sharp(Buffer.from(svg)).webp({ quality: 92, alphaQuality: alpha ? 100 : 82 }).toBuffer();

/* ── Steps ───────────────────────────────────────────────────────────────── */

async function fillDriverPortraits() {
  const rows = await db
    .select({
      id: drivers.id,
      slug: drivers.slug,
      firstName: drivers.firstName,
      lastName: drivers.lastName,
    })
    .from(drivers)
    .where(isNull(drivers.headshotMediaId));
  if (!rows.length) return console.log("  drivers: all have portraits");

  // team colour per driver, so a portrait matches the card it sits on
  const entries = await db
    .select({ driverId: driverSeasonEntries.driverId, color: teamSeasonEntries.primaryColor })
    .from(driverSeasonEntries)
    .innerJoin(
      teamSeasonEntries,
      eq(driverSeasonEntries.teamSeasonEntryId, teamSeasonEntries.id),
    );
  const colorByDriver = new Map(entries.map((e) => [e.driverId, e.color]));

  let n = 0;
  for (const d of rows) {
    const color = colorByDriver.get(d.id) ?? "#67676d";
    const body = await toWebp(driverPortraitSvg(color, d.slug), true);
    const id = await putImage({
      key: `driver-${d.slug}`,
      filename: `ctr-mock-driver-${d.slug}.webp`,
      body,
      alt: `${d.firstName} ${d.lastName}`,
      alpha: true,
    });
    if (id) {
      await db.update(drivers).set({ headshotMediaId: id }).where(eq(drivers.id, d.id));
      n += 1;
    }
  }
  console.log(`  drivers: ${n} portraits generated`);
}

async function fillTeamLogos() {
  const rows = await db
    .select({ id: teams.id, slug: teams.slug, name: teams.name })
    .from(teams)
    .where(isNull(teams.logoMediaId));
  if (!rows.length) return console.log("  teams: all have logos");

  const seasonColors = await db
    .select({ teamId: teamSeasonEntries.teamId, color: teamSeasonEntries.primaryColor })
    .from(teamSeasonEntries);
  const colorByTeam = new Map(seasonColors.map((t) => [t.teamId, t.color]));

  let n = 0;
  for (const t of rows) {
    const words = t.name.split(/[\s-]+/).filter(Boolean);
    const label =
      words.length === 1
        ? words[0].slice(0, 3).toUpperCase()
        : words
            .slice(0, 3)
            .map((w: string) => w[0])
            .join("")
            .toUpperCase();
    const body = await toWebp(markSvg(label, colorByTeam.get(t.id) ?? "#67676d"));
    const id = await putImage({
      key: `team-${t.slug}`,
      filename: `ctr-mock-team-${t.slug}.webp`,
      body,
      alt: `${t.name} logo`,
    });
    if (id) {
      await db.update(teams).set({ logoMediaId: id }).where(eq(teams.id, t.id));
      n += 1;
    }
  }
  console.log(`  teams: ${n} marks generated`);
}

async function fillSponsorLogos() {
  const rows = await db
    .select({ id: sponsors.id, name: sponsors.name })
    .from(sponsors)
    .where(isNull(sponsors.logoMediaId));
  if (!rows.length) return console.log("  sponsors: all have logos");

  let n = 0;
  for (const s of rows) {
    const key = `sponsor-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    const body = await toWebp(wordmarkSvg(s.name));
    const id = await putImage({
      key,
      filename: `ctr-mock-${key}.webp`,
      body,
      alt: `${s.name} logo`,
    });
    if (id) {
      await db.update(sponsors).set({ logoMediaId: id }).where(eq(sponsors.id, s.id));
      n += 1;
    }
  }
  console.log(`  sponsors: ${n} wordmarks generated`);
}

/** Real photos from the CTR library — never generated. */
const PHOTO_POOL = [
  "assets/incrc/banners/banner1.webp",
  "assets/incrc/banners/banner2.webp",
  "assets/incrc/banners/banner3.webp",
  "assets/incrc/banners/banner4.webp",
  "assets/incrc/banners/banner5.webp",
  "assets/incrc/grid/grid1.webp",
  "assets/incrc/grid/grid2.webp",
  "images/incrc/cars-lineup.webp",
  "assets/incrc/family/family.webp",
  "assets/incrc/partnership/partnership1.webp",
  "assets/incrc/partnership/partnership2.webp",
  "assets/incrc/partnership/partnership3.webp",
  "assets/landing/banners/banner1.webp",
  "assets/landing/banners/banner2.webp",
  "assets/landing/banners/banner3.webp",
  "assets/post/post1.webp",
  "assets/post/post2.webp",
  "assets/post/post3.webp",
];

async function photoId(i: number, alt: string): Promise<string | null> {
  const rel = PHOTO_POOL[i % PHOTO_POOL.length];
  const key = `photo-${rel.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return putPhoto(rel, key, alt);
}

async function fillVideoThumbnails() {
  const rows = await db
    .select({ id: videos.id, title: videos.title })
    .from(videos)
    .where(isNull(videos.thumbnailMediaId));
  if (!rows.length) return console.log("  videos: all have thumbnails");
  let n = 0;
  for (const [i, v] of rows.entries()) {
    const id = await photoId(i, v.title);
    if (id) {
      await db.update(videos).set({ thumbnailMediaId: id }).where(eq(videos.id, v.id));
      n += 1;
    }
  }
  console.log(`  videos: ${n} thumbnails set`);
}

async function fillArticleHeroes() {
  const rows = await db
    .select({ id: articles.id, title: articles.title })
    .from(articles)
    .where(isNull(articles.heroMediaId));
  if (!rows.length) return console.log("  articles: all have heroes");
  let n = 0;
  for (const [i, a] of rows.entries()) {
    const id = await photoId(i + 5, a.title);
    if (id) {
      await db.update(articles).set({ heroMediaId: id }).where(eq(articles.id, a.id));
      n += 1;
    }
  }
  console.log(`  articles: ${n} heroes set`);
}

async function fillGalleries() {
  const existing = await db.select({ id: galleries.id }).from(galleries);
  if (existing.length) return console.log("  galleries: already present");

  const specs = [
    {
      slug: "season-launch-2026",
      title: "2026 season launch",
      description: "The championship launch, the partnership signing and the new-look grid.",
      photos: [9, 10, 11, 0, 1],
    },
    {
      slug: "on-the-grid",
      title: "On the grid",
      description: "Pit lane, paddock and the cars of the seven INCRC categories.",
      photos: [5, 6, 7, 2, 3, 4],
    },
  ];

  for (const spec of specs) {
    const [row] = await db
      .insert(galleries)
      .values({
        slug: spec.slug,
        title: spec.title,
        description: spec.description,
        status: "published",
        publishedAt: new Date(),
      })
      .returning({ id: galleries.id });
    let sort = 0;
    for (const p of spec.photos) {
      const id = await photoId(p, spec.title);
      if (!id) continue;
      await db
        .insert(galleryItems)
        .values({ galleryId: row.id, mediaId: id, sort })
        .onConflictDoNothing();
      sort += 1;
    }
  }
  console.log(`  galleries: ${specs.length} created`);
}

async function fillRelations() {
  // video ↔ tag
  const [vids, tagRows] = await Promise.all([
    db.select({ id: videos.id }).from(videos),
    db.select({ id: tags.id }).from(tags),
  ]);
  let vt = 0;
  for (const [i, v] of vids.entries()) {
    for (const t of [tagRows[i % tagRows.length], tagRows[(i + 3) % tagRows.length]]) {
      if (!t) continue;
      const r = await db
        .insert(videoTags)
        .values({ videoId: v.id, tagId: t.id })
        .onConflictDoNothing()
        .returning({ id: videoTags.videoId });
      vt += r.length;
    }
  }

  // article ↔ related article
  const arts = await db.select({ id: articles.id }).from(articles);
  let ar = 0;
  for (const [i, a] of arts.entries()) {
    for (let k = 1; k <= 3; k += 1) {
      const other = arts[(i + k) % arts.length];
      if (!other || other.id === a.id) continue;
      const r = await db
        .insert(articleRelated)
        .values({ articleId: a.id, relatedArticleId: other.id, sort: k })
        .onConflictDoNothing()
        .returning({ id: articleRelated.articleId });
      ar += r.length;
    }
  }
  console.log(`  relations: ${vt} video tags, ${ar} related articles`);
}

async function fillFanActivity() {
  const [fanRows, artRows, roundRows, driverRows, teamRows] = await Promise.all([
    db.select({ id: fans.id }).from(fans),
    db.select({ id: articles.id }).from(articles).where(eq(articles.status, "published")),
    db.select({ id: rounds.id }).from(rounds),
    db.select({ id: drivers.id }).from(drivers),
    db.select({ id: teams.id }).from(teams),
  ]);
  if (!fanRows.length) return console.log("  fans: none to populate");

  const statuses = ["going", "maybe", "not_going"] as const;
  let saved = 0;
  let rsvp = 0;
  let fav = 0;

  for (const [i, f] of fanRows.entries()) {
    for (let k = 0; k < 3; k += 1) {
      const a = artRows[(i * 3 + k) % artRows.length];
      if (!a) continue;
      saved += (
        await db
          .insert(savedArticles)
          .values({ fanId: f.id, articleId: a.id })
          .onConflictDoNothing()
          .returning({ id: savedArticles.fanId })
      ).length;
    }
    for (const [k, r] of roundRows.entries()) {
      rsvp += (
        await db
          .insert(roundRsvps)
          .values({ fanId: f.id, roundId: r.id, status: statuses[(i + k) % statuses.length] })
          .onConflictDoNothing()
          .returning({ id: roundRsvps.fanId })
      ).length;
    }
    const d = driverRows[i % driverRows.length];
    const t = teamRows[i % teamRows.length];
    if (d)
      fav += (
        await db
          .insert(fanFavourites)
          .values({ fanId: f.id, entityType: "driver", entityId: d.id })
          .onConflictDoNothing()
          .returning({ id: fanFavourites.fanId })
      ).length;
    if (t)
      fav += (
        await db
          .insert(fanFavourites)
          .values({ fanId: f.id, entityType: "team", entityId: t.id })
          .onConflictDoNothing()
          .returning({ id: fanFavourites.fanId })
      ).length;
  }
  console.log(`  fan activity: ${saved} saved, ${rsvp} rsvps, ${fav} favourites`);
}

async function fillAdminPrefs() {
  const admins = await db.select({ id: adminUsers.id }).from(adminUsers);
  let n = 0;
  for (const a of admins) {
    n += (
      await db
        .insert(adminNotificationPrefs)
        .values({ adminUserId: a.id })
        .onConflictDoNothing()
        .returning({ id: adminNotificationPrefs.adminUserId })
    ).length;
  }
  console.log(`  admin prefs: ${n} created`);
}

/**
 * Race results are OFF by default and gated behind --with-results.
 *
 * The 2026 season's first round is 11–13 September 2026 — nothing has been
 * raced yet, so an empty standings table is CORRECT, not a missing-seed gap.
 * Inventing finishing positions would publish results for races that have
 * not happened, on a live public domain, for a real championship with real
 * partners. That is a decision for a human, not a default.
 */
async function simulateResults() {
  const sessions = await db
    .select({ id: raceSessions.id, roundId: raceSessions.roundId, categoryId: raceSessions.categoryId, type: raceSessions.type })
    .from(raceSessions)
    .where(eq(raceSessions.type, "race"));

  const entries = await db
    .select({
      entryId: driverSeasonEntries.id,
      categoryId: driverSeasonEntries.categoryId,
      seasonId: driverSeasonEntries.championshipSeasonId,
    })
    .from(driverSeasonEntries);

  let made = 0;
  for (const s of sessions) {
    const grid = entries.filter((e) => e.categoryId === s.categoryId);
    if (!grid.length) continue;
    const order = [...grid].sort(
      (a, b) => pick(a.entryId + s.id, 1000) - pick(b.entryId + s.id, 1000),
    );
    for (const [i, e] of order.entries()) {
      const r = await db
        .insert(sessionResults)
        .values({
          sessionId: s.id,
          driverSeasonEntryId: e.entryId,
          position: i + 1,
          status: "finished",
          laps: 18,
          gridPosition: ((i + 3) % order.length) + 1,
          fastestLap: i === 0,
        })
        .onConflictDoNothing()
        .returning({ id: sessionResults.id });
      made += r.length;
    }
    await db.update(raceSessions).set({ status: "completed" }).where(eq(raceSessions.id, s.id));
  }
  await db.update(rounds).set({ status: "completed" }).where(sql`true`);
  console.log(`  results: ${made} classifications written`);

  for (const seasonId of [...new Set(entries.map((e) => e.seasonId))]) {
    await computeStandings(db, seasonId);
  }
  console.log("  standings recomputed");
}

/* ── Main ────────────────────────────────────────────────────────────────── */

async function main() {
  const withResults = process.argv.includes("--with-results");
  console.log(`Mock-data top-up${hasS3 ? "" : " (S3 not configured — images skipped)"}\n`);

  await fillDriverPortraits();
  await fillTeamLogos();
  await fillSponsorLogos();
  await fillVideoThumbnails();
  await fillArticleHeroes();
  await fillGalleries();
  await fillRelations();
  await fillFanActivity();
  await fillAdminPrefs();

  if (withResults) {
    console.log("\n--with-results: simulating race classifications…");
    await simulateResults();
  } else {
    console.log(
      "\n  results: skipped (season starts 11 Sep 2026 — pass --with-results to invent them)",
    );
  }

  await pool.end();
  console.log("\nTop-up complete ✓");
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
