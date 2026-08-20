/**
 * CTR Sports seed — replaces the F1 reference data with the real
 * CTR–JK Tyre FMSCI Indian National Car Racing Championship 2026:
 * 7 categories, 4 rounds, 3 circuits, real partners/people/copy, and
 * clearly-marked placeholder grids (all CMS-editable). Brand assets are
 * uploaded to S3 from the existing CTR site repo when available.
 */
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { eq, inArray } from "drizzle-orm";
import type { Db } from "../client";
import { computeStandings } from "../points";
import {
  articleCategories,
  articles,
  articleTags,
  championships,
  championshipSeasons,
  circuits,
  contentBlocks,
  drivers,
  driverSeasonEntries,
  galleries,
  media,
  pages,
  pollOptions,
  polls,
  raceCategories,
  raceSessions,
  rounds,
  siteSettings,
  sponsors,
  tags,
  teams,
  teamSeasonEntries,
  videos,
  cars,
} from "../schema";
import {
  ASSET_SOURCE_DIR,
  BRAND,
  BRAND_ASSETS,
  CATEGORIES,
  CIRCUITS,
  CTR_UNIFIED_TEAMS,
  DRIVER_POOL,
  PARTNERS,
  PEOPLE,
  ROUNDS,
  SOCIAL_LINKS,
  TEAMS,
  TICKET_TIERS,
  VISION,
} from "./ctr-data";
import { parseTimeToMs } from "../format";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Minimal TipTap doc builder (strings → paragraphs, {h} → h2). */
function buildBody(blocks: (string | { h: string })[]) {
  const content = blocks.map((b) =>
    typeof b === "string"
      ? { type: "paragraph", content: [{ type: "text", text: b }] }
      : { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: b.h }] },
  );
  const html = blocks
    .map((b) => (typeof b === "string" ? `<p>${b}</p>` : `<h2>${b.h}</h2>`))
    .join("\n");
  return { json: { type: "doc", content }, html };
}

/* ── 1. Wipe the F1 reference data ──────────────────────────────────────── */

export async function wipeOldData(db: Db) {
  console.log("Wiping previous seed data…");
  // content (cascades: blocks, tags joins, saved articles, poll options/votes)
  await db.delete(articles);
  await db.delete(videos);
  await db.delete(galleries);
  await db.delete(pages);
  await db.delete(sponsors);
  await db.delete(polls);
  await db.delete(tags);
  await db.delete(articleCategories);
  await db.delete(siteSettings);
  // racing (championship cascade wipes seasons/rounds/sessions/results/entries/standings)
  await db.delete(championships);
  await db.delete(teams);
  await db.delete(drivers);
  await db.delete(circuits);
  await db.delete(raceCategories);
}

/* ── 2. Brand assets → S3 → media rows (idempotent, failure-tolerant) ───── */

export async function seedAssets(db: Db): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  const bucket = process.env.S3_BUCKET;
  const hasS3 =
    bucket && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY;

  if (!hasS3) {
    console.warn("  S3 not configured — seeding without images");
    return ids;
  }
  const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });

  console.log("Uploading brand assets to S3…");
  const allAssets = [
    ...BRAND_ASSETS,
    ...CIRCUITS.flatMap((c) => [
      { key: `${c.slug}-photo`, path: c.photoAsset, alt: `${c.name}` },
      { key: `${c.slug}-map`, path: c.mapAsset, alt: `${c.name} track map` },
    ]),
  ];

  for (const asset of allAssets) {
    const filename = `ctr-seed-${asset.key}.webp`;
    try {
      // reuse an existing row on re-run
      const existing = await db.select().from(media).where(eq(media.filename, filename));
      if (existing[0]) {
        ids.set(asset.key, existing[0].id);
        continue;
      }
      const file = resolve(ASSET_SOURCE_DIR, asset.path);
      const body = readFileSync(file);
      const key = `media/seed/${asset.key}.webp`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      const [row] = await db
        .insert(media)
        .values({
          kind: "image",
          path: key,
          filename,
          mime: "image/webp",
          sizeBytes: statSync(file).size,
          alt: asset.alt,
          credit: "CTR Sports",
        })
        .returning({ id: media.id });
      ids.set(asset.key, row.id);
      console.log(`  ↑ ${asset.key}`);
    } catch (err) {
      console.warn(`  ⚠ skipped asset ${asset.key}: ${(err as Error).message}`);
    }
  }
  return ids;
}

/* ── 3. Racing structure ────────────────────────────────────────────────── */

export async function seedRacingCtr(db: Db, assets: Map<string, string>) {
  console.log("Seeding INCRC 2026…");

  /* the championship + its 2026 season */
  const [championship] = await db
    .insert(championships)
    .values({
      slug: "incrc",
      name: BRAND.championship,
      shortName: "INCRC",
      type: "mixed",
      description:
        "India's biggest multi-category national car racing championship — seven categories, one national banner, sanctioned by the FMSCI and presented by CTR & JK Tyre.",
      primaryColor: "#F7D619",
      secondaryColor: "#0A0A0A",
      logoMediaId: assets.get("crest-racing") ?? null,
      isActive: true,
      sort: 0,
    })
    .returning({ id: championships.id });

  const [season] = await db
    .insert(championshipSeasons)
    .values({
      championshipId: championship.id,
      year: 2026,
      isCurrent: true,
      pointsSystem: { race: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], sprint: [8, 7, 6, 5, 4, 3, 2, 1] },
      standingsTypes: ["overall", "team", "rookie", "gentlemen"],
    })
    .returning({ id: championshipSeasons.id });

  /* categories */
  const categoryIds = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const [row] = await db
      .insert(raceCategories)
      .values({
        championshipId: championship.id,
        slug: c.slug,
        name: c.name,
        shortName: c.shortName,
        description: c.description,
        carSpec: c.carSpec,
        color: c.color,
        sort: i,
        imageMediaId: assets.get("cars-lineup") ?? null,
      })
      .returning({ id: raceCategories.id });
    categoryIds.set(c.slug, row.id);
  }

  /* circuits */
  const circuitIds = new Map<string, string>();
  for (const c of CIRCUITS) {
    const [row] = await db
      .insert(circuits)
      .values({
        slug: c.slug,
        name: c.name,
        officialName: c.officialName,
        locality: c.locality,
        country: c.country,
        countryCode: c.countryCode,
        lengthKm: c.lengthKm,
        turns: c.turns,
        direction: c.direction,
        fiaGrade: c.fiaGrade,
        owner: c.owner,
        website: c.website,
        lapRecordTimeMs: c.lapRecord ? parseTimeToMs(c.lapRecord) : null,
        lapRecordYear: c.lapRecordYear,
        firstGpYear: c.firstGpYear,
        description: c.description,
        photoMediaId: assets.get(`${c.slug}-photo`) ?? null,
        mapMediaId: assets.get(`${c.slug}-map`) ?? null,
      })
      .returning({ id: circuits.id });
    circuitIds.set(c.slug, row.id);
  }

  /* teams + 2026 entries */
  const teamEntryIds: string[] = [];
  for (const t of TEAMS) {
    const [team] = await db
      .insert(teams)
      .values({
        slug: t.slug,
        name: t.name,
        fullName: t.fullName,
        base: t.base,
        countryCode: "IN",
        firstEntryYear: t.firstEntryYear,
        description:
          t.description ??
          "Placeholder team profile — replace with the confirmed entrant via the CMS.",
        logoMediaId: t.slug === "chennai-turbo-riders" ? (assets.get("ctr-logo") ?? null) : null,
      })
      .returning({ id: teams.id });
    const [entry] = await db
      .insert(teamSeasonEntries)
      .values({
        teamId: team.id,
        championshipSeasonId: season.id,
        displayName: t.fullName.replace(" (placeholder)", ""),
        shortName: t.name,
        primaryColor: t.color,
        secondaryColor: t.secondary,
        teamPrincipal: t.principal,
        powerUnitSupplier: null,
      })
      .returning({ id: teamSeasonEntries.id });
    teamEntryIds.push(entry.id);
    await db.insert(cars).values({
      teamSeasonEntryId: entry.id,
      modelName: "2026 entry",
      powerUnit: null,
    });
  }

  /* placeholder drivers: 8 per category (4 teams × 2 cars) */
  console.log("  seeding placeholder grids (CMS-editable)…");
  const NUMBERS = [5, 7, 9, 11, 17, 21, 27, 33];
  let poolIdx = 0;
  for (const [catIdx, c] of CATEGORIES.entries()) {
    const categoryId = categoryIds.get(c.slug)!;
    for (let d = 0; d < 8; d++) {
      const name = DRIVER_POOL[poolIdx % DRIVER_POOL.length];
      poolIdx++;
      const [first, ...rest] = name.split(" ");
      const last = rest.join(" ") || first;
      const slug = slugify(`${name}-${c.shortName}`);
      const [driver] = await db
        .insert(drivers)
        .values({
          slug,
          firstName: first,
          lastName: last,
          code: last.slice(0, 3).toUpperCase(),
          countryCode: "IN",
          biography:
            "Placeholder driver profile for the 2026 entry list — update with the confirmed entrant in the CMS.",
        })
        .onConflictDoNothing()
        .returning({ id: drivers.id });
      if (!driver) continue;
      const teamEntryId = teamEntryIds[(catIdx + Math.floor(d / 2)) % teamEntryIds.length];
      await db.insert(driverSeasonEntries).values({
        driverId: driver.id,
        teamSeasonEntryId: teamEntryId,
        championshipSeasonId: season.id,
        categoryId,
        // Levitas Cup runs parallel Rookie + Gentlemen classifications on one grid
        classification:
          c.slug === "levitas-cup" ? (d % 2 === 0 ? "rookie" : "gentlemen") : null,
        carNumber: NUMBERS[d],
        role: "primary",
      });
    }
  }

  /* rounds + per-category sessions */
  const heroByRound: (string | undefined)[] = [
    assets.get("one-nation"),
    assets.get("banner-2"),
    assets.get("banner-3"),
    assets.get("banner-5"),
  ];
  for (const r of ROUNDS) {
    const circuit = CIRCUITS.find((c) => c.slug === r.circuit)!;
    const [gp] = await db
      .insert(rounds)
      .values({
        championshipSeasonId: season.id,
        round: r.round,
        slug: `round-${r.round}-${slugify(r.city)}`,
        name: `Round ${r.round} — ${r.city}`,
        officialName: `${BRAND.championship} 2026 · Round ${r.round} · ${circuit.name}`,
        circuitId: circuitIds.get(r.circuit)!,
        startDate: r.start,
        endDate: r.end,
        hasSprint: false,
        status: "scheduled",
        heroMediaId: heroByRound[r.round - 1] ?? null,
      })
      .returning({ id: rounds.id });

    // Friday = start date (practice + qualifying), Saturday = Race 1, Sunday = Race 2
    const friday = r.start;
    const saturday = new Date(new Date(`${r.start}T00:00:00Z`).getTime() + 86400000)
      .toISOString()
      .slice(0, 10);
    const sunday = r.end;

    const at = (date: string, h: number, m: number) =>
      new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`);
    const slot = (base: Date, idx: number, mins: number) =>
      new Date(base.getTime() + idx * mins * 60000);

    const sessionValues = CATEGORIES.flatMap((c, i) => {
      const categoryId = categoryIds.get(c.slug)!;
      const mk = (
        type: "fp1" | "qualifying" | "race",
        sequence: number,
        label: string,
        startsAt: Date,
        durMin: number,
      ) => ({
        roundId: gp.id,
        categoryId,
        type,
        sequence,
        label: `${c.shortName} — ${label}`,
        startsAt,
        endsAt: new Date(startsAt.getTime() + durMin * 60000),
        status: "scheduled" as const,
      });
      return [
        mk("fp1", 1, "Practice", slot(at(friday, 8, 30), i, 40), 30),
        mk("qualifying", 1, "Qualifying", slot(at(friday, 14, 0), i, 30), 20),
        mk("race", 1, "Race 1", slot(at(saturday, 9, 30), i, 45), 35),
        mk("race", 2, "Race 2", slot(at(sunday, 9, 30), i, 45), 35),
      ];
    });
    await db.insert(raceSessions).values(sessionValues);
  }

  const standings = await computeStandings(db, season.id);
  console.log(
    `  ${CATEGORIES.length} categories, ${ROUNDS.length} rounds, standings initialised (${standings.drivers} drivers, ${standings.categories} category tables, ${standings.subTypes} sub-classifications)`,
  );
}

/* ── 4. Content ─────────────────────────────────────────────────────────── */

export async function seedContentCtr(db: Db, assets: Map<string, string>) {
  console.log("Seeding CTR content…");

  await db
    .insert(articleCategories)
    .values([
      { slug: "news", name: "News", sort: 0 },
      { slug: "feature", name: "Feature", sort: 1 },
      { slug: "race-report", name: "Race Report", sort: 2 },
      { slug: "technical", name: "Technical", sort: 3 },
      { slug: "explainer", name: "Explainer", sort: 4 },
      { slug: "interview", name: "Interview", sort: 5 },
    ])
    .onConflictDoNothing();

  const TAGS_LIST = [
    "incrc-2026",
    "jk-tyre",
    "kari-motor-speedway",
    "bren-raceway",
    "madras-international-circuit",
    "tickets",
    "categories",
    "ctr-unified",
  ];
  await db
    .insert(tags)
    .values(
      TAGS_LIST.map((t) => ({
        slug: t,
        name: t.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
      })),
    )
    .onConflictDoNothing();

  const catRows = await db.select().from(articleCategories);
  const tagRows = await db.select().from(tags);
  const catId = new Map(catRows.map((c) => [c.slug, c.id]));
  const tagId = new Map(tagRows.map((t) => [t.slug, t.id]));

  const d1 = PEOPLE.directors[0];
  const d2 = PEOPLE.directors[1];

  const ARTICLES: {
    slug: string;
    title: string;
    standfirst: string;
    category: string;
    tags: string[];
    hero?: string;
    isBreaking?: boolean;
    body: (string | { h: string })[];
  }[] = [
    {
      slug: "ctr-jk-tyre-incrc-2026-launch",
      title: "CTR and JK Tyre launch the 2026 FMSCI Indian National Car Racing Championship",
      standfirst:
        "One Nation. One Championship. Seven categories, four rounds and three iconic circuits — Indian motorsport gets its unified national stage.",
      category: "news",
      tags: ["incrc-2026", "jk-tyre"],
      hero: "signing-1",
      isBreaking: true,
      body: [
        "Chennai Turbo Riders and JK Tyre have signed the agreement that brings the CTR–JK Tyre FMSCI Indian National Car Racing Championship to life — India's biggest multi-category national car racing championship, sanctioned by the FMSCI.",
        `"${d1.quote}" said ${d1.name}, ${d1.title}.`,
        { h: "A single grid for the whole country" },
        "Seven racing categories — from Formula 4 machinery to saloons, hatchbacks and touring cars — will line up under one national banner across a four-round calendar at Kari Motor Speedway, Bren Raceway and the Madras International Circuit.",
        `"${d2.quote}" added ${d2.name}, ${d2.title}.`,
        "Every round will be carried live on OTT with full onboard coverage. The 2026 season opens at Kari Motor Speedway, Coimbatore, on 11–13 September.",
      ],
    },
    {
      slug: "incrc-2026-calendar-revealed",
      title: "One nation, one championship: the 2026 INCRC calendar revealed",
      standfirst: "Four rounds. Three iconic circuits. The road to glory starts in Coimbatore this September.",
      category: "news",
      tags: ["incrc-2026"],
      hero: "one-nation",
      body: [
        "The inaugural CTR–JK Tyre FMSCI Indian National Car Racing Championship calendar is set: four three-day race weekends between September and December 2026.",
        { h: "The 2026 calendar" },
        "Round 1 — Kari Motor Speedway, Coimbatore, 11–13 September. Round 2 — Kari Motor Speedway, Coimbatore, 23–25 October. Round 3 — Bren Raceway, Bengaluru, 13–15 November. Round 4 — Madras International Circuit, Chennai, 11–13 December: the season finale.",
        "Each weekend runs practice and qualifying on Friday, Race 1 on Saturday and Race 2 on Sunday for every one of the seven categories — a full three days of national racing at every stop.",
      ],
    },
    {
      slug: "seven-categories-explained",
      title: "The seven categories of the 2026 INCRC, explained",
      standfirst: "From first-timer Formula 1300s to the headline Indian Super Touring Cars — where every racer fits.",
      category: "explainer",
      tags: ["categories", "incrc-2026"],
      hero: "cars-lineup",
      body: [
        "How does a single grid bring Formula 4 cars, saloons, hatchbacks and touring cars to the same race weekend? The 2026 championship is built as a ladder — seven categories, each a step in a racing career.",
        { h: "The tin-tops" },
        "Indian Super Touring Cars is the premier class, with Indian Touring Cars and Indian Junior Touring Cars beneath it. Super Stock offers cost-capped racing in near-showroom machinery, while the Levitas Cup is a one-make series where only the driver makes the difference.",
        { h: "The single-seaters" },
        "Formula LGB F4 is India's classic open-wheel proving ground, and Formula 1300 — the Novice Cup — is the first rung on the single-seater ladder for first-time formula racers.",
      ],
    },
    {
      slug: "venue-guide-kari-motor-speedway",
      title: "Venue guide: Kari Motor Speedway, Coimbatore",
      standfirst: "Tight, technical and steeped in history — the cradle of Indian motorsport opens the season.",
      category: "feature",
      tags: ["kari-motor-speedway", "incrc-2026"],
      hero: "kari-motor-speedway-photo",
      body: [
        "Named in memory of legendary Indian racer and constructor S. Karivardhan, Kari Motor Speedway in Chettipalayam, Coimbatore has launched generations of Indian racing careers.",
        { h: "The circuit" },
        "At 2.1 km with 15 turns, the FIA Grade 3 track is a technical, tight lap where rhythm matters more than horsepower. The current lap record of 1:03.296 was set in 2024.",
        "Kari hosts both Round 1 (11–13 September) and Round 2 (23–25 October) of the 2026 championship — twenty-six race starts across two weekends at the sport's spiritual home.",
      ],
    },
    {
      slug: "venue-guide-bren-raceway",
      title: "Bren Raceway: Bengaluru's new home of speed",
      standfirst: "An FIA Grade 2, 4.1 km international circuit at Doddaballapur joins the national calendar.",
      category: "feature",
      tags: ["bren-raceway", "incrc-2026"],
      hero: "bren-raceway-photo",
      body: [
        "Round 3 takes the championship somewhere Indian national racing has never been: Bren Raceway, the FIA Grade 2 specification circuit at Doddaballapur on the outskirts of Bengaluru.",
        { h: "Built to international standards" },
        "Developed by Bren Garage, the 4.1 km, 14-turn track was designed for testing, performance driving and exclusive motorsport events — and is eligible to host international formula racing.",
        "For every driver on the 2026 grid, Bengaluru will be a brand-new challenge: no data, no experience, no advantage. 13–15 November.",
      ],
    },
    {
      slug: "venue-guide-madras-international-circuit",
      title: "Venue guide: Madras International Circuit — the season decider",
      standfirst: "A long back straight into a hairpin, and thirty-six years of history. The finale belongs to Chennai.",
      category: "feature",
      tags: ["madras-international-circuit", "incrc-2026"],
      hero: "madras-international-circuit-photo",
      body: [
        "India's original permanent race track hosts the final round. The Madras International Circuit at Irungattukottai has been home to Indian national racing since 1990 — and in December it decides the first INCRC titles.",
        { h: "The circuit" },
        "3.71 km, 12 turns, FIA Grade 2, run by the Madras Motor Sports Club. The signature moment: a long back straight funnelling the field into a hairpin — the best overtaking spot of the season, on CTR's home soil.",
        "Round 4, 11–13 December 2026. Every championship, decided here.",
      ],
    },
    {
      slug: "tickets-explained-2026",
      title: "Tickets explained: from the Grand Stand to the CTR Executive Lounge",
      standfirst: "Choose your view. Live the thrill. Four ways to experience a 2026 race weekend.",
      category: "explainer",
      tags: ["tickets", "incrc-2026"],
      hero: "family",
      body: [
        "Every 2026 race weekend offers four tiers of race-day experience — all with access to the car fest, go-karting, and music and entertainment around the circuit.",
        { h: "The four tiers" },
        "Grand Stand puts you in the best seats with the true atmosphere. Riders Terrace adds a premium race view near the pit lane, a photo booth and complimentary refreshments. Turbo Deck is full championship access with premium hospitality and complimentary food. And the CTR Executive Lounge is the ultimate VIP experience: an air-conditioned lounge, premium food service and pit access.",
        "Tickets for Round 1 at Kari Motor Speedway are on sale now.",
      ],
    },
    {
      slug: "the-ctr-story",
      title: "The CTR story: from taking the track in 2022 to building a national championship",
      standfirst: "From passion to purpose. From track to legacy. How Chennai Turbo Riders became CTR Unified.",
      category: "feature",
      tags: ["ctr-unified", "incrc-2026"],
      hero: "banner-2",
      body: [
        "Chennai Turbo Riders started as a professional motorsports team dedicated to nurturing racing talent and promoting motorsports culture in India — first taking the track in 2022.",
        { h: "From team to platform" },
        "The mission grew: creating structured opportunities for drivers and engineers to progress from grassroots racing to professional championships, built on performance, precision and passion.",
        "Today CTR Unified spans motorsport, field hockey, pickleball, volleyball and cricket — every programme with its own coaching structure and competitive calendar, sharing one standard of preparation and one identity. And in 2026, CTR is not organizing the future of Indian motorsport. CTR is building it.",
      ],
    },
  ];

  let published = Date.now() - ARTICLES.length * 36e5;
  for (const a of ARTICLES) {
    const { json, html } = buildBody(a.body);
    const [row] = await db
      .insert(articles)
      .values({
        slug: a.slug,
        title: a.title,
        standfirst: a.standfirst,
        heroMediaId: a.hero ? (assets.get(a.hero) ?? null) : null,
        categoryId: catId.get(a.category) ?? null,
        body: json,
        bodyHtml: html,
        status: "published",
        publishedAt: new Date((published += 36e5)),
        isBreaking: a.isBreaking ?? false,
        authorNameOverride: "CTR Sports",
      })
      .onConflictDoNothing()
      .returning({ id: articles.id });
    if (row) {
      await db
        .insert(articleTags)
        .values(a.tags.map((t) => ({ articleId: row.id, tagId: tagId.get(t)! })))
        .onConflictDoNothing();
    }
  }
  console.log(`  ${ARTICLES.length} articles`);

  /* pages */
  const tierHtml = TICKET_TIERS.map(
    (t) =>
      `<h2>${t.name}</h2><p><em>${t.strap}</em></p><ul>${t.features
        .map((f) => `<li>${f}</li>`)
        .join("")}</ul>`,
  ).join("\n");

  const PAGES: {
    slug: string;
    title: string;
    blocks: { type: "hero" | "rich_text" | "image" | "cta" | "faq" | "sponsor_grid"; data: Record<string, unknown> }[];
  }[] = [
    {
      slug: "about",
      title: "The World of CTR",
      blocks: [
        { type: "hero", data: { heading: "The World of CTR", sub: BRAND.tagline } },
        {
          type: "rich_text",
          data: {
            html: `<p>Chennai Turbo Riders is a professional motorsports team dedicated to nurturing racing talent and promoting motorsports culture in India — creating structured opportunities for drivers and engineers to grow from grassroots racing to professional championships, built on performance, precision and passion.</p><p><strong>${BRAND.legacyLine}</strong></p><h2>A new era of Indian motorsport</h2>${VISION.map((v) => `<h3>${v.title}</h3><p>${v.body}</p>`).join("")}`,
          },
        },
        { type: "image", data: { mediaKey: "signing-2", alt: "The partnership handshake" } },
        {
          type: "rich_text",
          data: {
            html: `<h2>Leadership</h2><blockquote><p>${d1.quote}</p><p>— ${d1.name}, ${d1.title}</p></blockquote><blockquote><p>${d2.quote}</p><p>— ${d2.name}, ${d2.title}</p></blockquote><p>Team Principal: <strong>${PEOPLE.teamPrincipal.name}</strong></p>`,
          },
        },
        {
          type: "rich_text",
          data: {
            html: `<h2>CTR Unified</h2><p>One organisation behind every discipline we compete in — every programme runs with its own coaching structure and competitive calendar, sharing one standard of preparation, one identity, and one long-term commitment to developing Indian sporting talent.</p><ul>${CTR_UNIFIED_TEAMS.map((t) => `<li><strong>${t.sport}</strong> — ${t.team}</li>`).join("")}</ul><p>Contact: ${BRAND.address} · ${BRAND.phone} · ${BRAND.email}</p>`,
          },
        },
        { type: "cta", data: { heading: "Race with CTR — 2026 registration is open", buttonLabel: "Register now", href: "https://chennaiturboriders.in/IndianNationalCarRacingChampionship/registration" } },
      ],
    },
    {
      slug: "tickets",
      title: "Tickets & Hospitality",
      blocks: [
        { type: "hero", data: { heading: "Choose your view. Live the thrill.", sub: "Race weekend tickets — 2026 season" } },
        { type: "rich_text", data: { html: tierHtml } },
        {
          type: "faq",
          data: {
            items: [
              { q: "Where do the 2026 rounds take place?", a: "Rounds 1 & 2 at Kari Motor Speedway, Coimbatore (11–13 Sep, 23–25 Oct); Round 3 at Bren Raceway, Bengaluru (13–15 Nov); Round 4 at Madras International Circuit, Chennai (11–13 Dec)." },
              { q: "What's included with every ticket?", a: "All tiers include the car fest, go-karting, and music & entertainment around the circuit across the race weekend." },
              { q: "How do I race instead of watch?", a: "2026 driver registration is open across all seven categories — see the registration link on the About page." },
            ],
          },
        },
        { type: "cta", data: { heading: "Round 1 · Kari Motor Speedway · 11–13 September 2026", buttonLabel: "See the schedule", href: "/schedule" } },
      ],
    },
    {
      slug: "partners",
      title: "Partners",
      blocks: [
        { type: "hero", data: { heading: "Behind the grid", sub: "A landmark partnership — CTR, JK Tyre and FMSCI" } },
        { type: "rich_text", data: { html: "<p>CTR, JK Tyre and FMSCI put pen to paper — bringing India's biggest multi-category national car racing championship to life. Entertainment isn't created by one organiser: it is powered by an entire motorsport family.</p>" } },
        { type: "sponsor_grid", data: {} },
      ],
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      blocks: [
        { type: "rich_text", data: { html: "<h2>Privacy Policy</h2><p>We collect only the information needed to run fan accounts and the newsletter: an email address, a display name and your saved preferences. We never sell personal data.</p><p>You can delete your account at any time from the account page. Newsletter emails include a one-click unsubscribe link.</p>" } },
      ],
    },
    {
      slug: "terms-of-use",
      title: "Terms of Use",
      blocks: [
        { type: "rich_text", data: { html: "<h2>Terms of Use</h2><p>By using this site you agree to use it lawfully and respectfully. Content is provided for personal, non-commercial use. Session classifications and standings are provided without warranty.</p>" } },
      ],
    },
  ];

  for (const p of PAGES) {
    const [row] = await db
      .insert(pages)
      .values({ slug: p.slug, title: p.title, status: "published" })
      .onConflictDoNothing()
      .returning({ id: pages.id });
    if (row) {
      await db.insert(contentBlocks).values(
        p.blocks.map((b, i) => {
          // resolve seed-asset references to real media ids
          const data = { ...b.data };
          if (typeof data.mediaKey === "string") {
            data.mediaId = assets.get(data.mediaKey) ?? null;
            delete data.mediaKey;
          }
          return { pageId: row.id, type: b.type, sort: i, data };
        }),
      );
    }
  }
  console.log(`  ${PAGES.length} pages`);

  /* partners */
  await db.insert(sponsors).values(
    PARTNERS.map((p, i) => ({
      name: p.name,
      tier: p.tier,
      sort: i,
      url:
        p.name === "JK Tyre"
          ? "https://www.jktyre.com"
          : p.name === "FMSCI"
            ? "https://www.fmsci.co.in"
            : null,
      logoMediaId:
        p.name === "JK Tyre"
          ? (assets.get("jktyre-logo") ?? null)
          : p.name === "FMSCI"
            ? (assets.get("fmsci-logo") ?? null)
            : null,
    })),
  );

  /* sample draft videos */
  await db
    .insert(videos)
    .values(
      [
        { slug: "incrc-launch-film", title: "INCRC 2026 launch film (set YouTube ID)" },
        { slug: "kari-onboard-lap", title: "Onboard lap: Kari Motor Speedway (set YouTube ID)" },
        { slug: "press-meet-highlights", title: "Press meet highlights (set YouTube ID)" },
        { slug: "meet-the-categories", title: "Meet the seven categories (set YouTube ID)" },
      ].map((v) => ({
        ...v,
        description: "Sample video — set a YouTube video ID in the CMS and publish.",
        provider: "youtube" as const,
        status: "draft" as const,
      })),
    )
    .onConflictDoNothing();

  /* settings */
  const SETTINGS = [
    { key: "current_season", value: { year: 2026 }, description: "Season shown by default" },
    {
      key: "theme",
      value: { accent: "#F7D619", accentDark: "#E0BF06", accentFg: "#0A0A0A" },
      description: "Site accent colour (hex) — accentFg is the text colour used on the accent",
    },
    {
      key: "nav_links",
      value: [
        { label: "Latest", href: "/latest" },
        { label: "Schedule", href: "/schedule" },
        { label: "Results", href: "/results/2026" },
        { label: "Standings", href: "/standings/2026/drivers" },
        { label: "Drivers", href: "/drivers" },
        { label: "Teams", href: "/teams" },
        { label: "Tickets", href: "/tickets" },
      ],
      description: "Main site navigation",
    },
    { key: "social_links", value: SOCIAL_LINKS, description: "Social icons in the footer" },
    {
      key: "footer_links",
      value: [
        {
          group: "Championship",
          links: [
            { label: "Schedule", href: "/schedule" },
            { label: "Standings", href: "/standings/2026/drivers" },
            { label: "Drivers", href: "/drivers" },
            { label: "Teams", href: "/teams" },
            { label: "Latest News", href: "/latest" },
          ],
        },
        {
          group: "Experience",
          links: [
            { label: "Tickets & Hospitality", href: "/tickets" },
            { label: "The World of CTR", href: "/about" },
            { label: "Partners", href: "/partners" },
          ],
        },
        {
          group: "Legal",
          links: [
            { label: "Privacy Policy", href: "/privacy-policy" },
            { label: "Terms of Use", href: "/terms-of-use" },
          ],
        },
      ],
      description: "Footer link groups",
    },
    {
      key: "broadcast_banner",
      value: {
        enabled: true,
        text: "Round 1 · Kari Motor Speedway, Coimbatore · 11–13 September 2026 — tickets & entries open",
        href: "/tickets",
      },
      description: "Banner above the main nav",
    },
  ];
  for (const s of SETTINGS) await db.insert(siteSettings).values(s).onConflictDoNothing();

  /* poll */
  const [poll] = await db
    .insert(polls)
    .values({
      slug: "favourite-category-2026",
      question: "Which INCRC category are you most excited to watch in 2026?",
      kind: "poll",
      status: "open",
      opensAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: polls.id });
  if (poll) {
    await db.insert(pollOptions).values(
      CATEGORIES.map((c, i) => ({ pollId: poll.id, label: c.name, sort: i })),
    );
  }

  console.log("  partners, settings, poll ✓");
}
