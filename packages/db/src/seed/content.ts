import { desc, eq } from "drizzle-orm";
import type { Db } from "../client";
import {
  articleCategories,
  articles,
  articleTags,
  contentBlocks,
  driverStandings,
  drivers,
  pages,
  pollOptions,
  polls,
  siteSettings,
  sponsors,
  tags,
  videos,
} from "../schema";

/** Minimal TipTap doc builder: strings become paragraphs, {h} becomes an h2. */
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

const CATEGORIES = [
  { slug: "news", name: "News", sort: 0 },
  { slug: "feature", name: "Feature", sort: 1 },
  { slug: "race-report", name: "Race Report", sort: 2 },
  { slug: "technical", name: "Technical", sort: 3 },
  { slug: "explainer", name: "Explainer", sort: 4 },
  { slug: "interview", name: "Interview", sort: 5 },
];

const TAGS = ["formula-1", "2026-season", "regulations", "sprint", "monaco", "pit-stops", "guide"];

const ARTICLES: {
  slug: string;
  title: string;
  standfirst: string;
  category: string;
  tags: string[];
  isBreaking?: boolean;
  body: (string | { h: string })[];
}[] = [
  {
    slug: "welcome-to-ctr-sports",
    title: "Welcome to CTR Sports — your new home for Formula Racing",
    standfirst:
      "Live standings, full race results, driver and team profiles, and daily news — all in one place.",
    category: "news",
    tags: ["formula-1", "2026-season"],
    isBreaking: true,
    body: [
      "CTR Sports launches today with complete coverage of the Formula Racing world championship: every session of every race weekend, live-updated standings, in-depth team and driver profiles, and a newsroom that runs all season long.",
      { h: "Everything in one place" },
      "Use the Schedule to follow each Grand Prix weekend session by session, dive into Results for full classifications back to 2025, and track the title fights on the Standings pages. Every driver and team has a dedicated profile with career statistics computed from real race data.",
      "Create a free fan account to save articles, pick your favourite driver and team, and vote in race-week polls and predictions.",
    ],
  },
  {
    slug: "how-f1-points-and-standings-work",
    title: "How points and standings work in 2026",
    standfirst: "25 for a win, 8 for a sprint victory — and a countback rule that can decide a title.",
    category: "explainer",
    tags: ["formula-1", "guide", "regulations"],
    body: [
      "Grand Prix points go to the top ten finishers on the classic 25-18-15-12-10-8-6-4-2-1 scale. Sprint races award points to the top eight, from 8 down to 1. There is no longer a bonus point for fastest lap.",
      { h: "What happens in a tie?" },
      "If two drivers end the season level on points, the championship falls back to a countback: most wins, then most second places, and so on down the order. The same rule decides the constructors' championship, where both cars' points count all season.",
      "Standings on this site are recomputed automatically every time a result is published, using each season's exact points scheme.",
    ],
  },
  {
    slug: "2026-regulations-explained",
    title: "The 2026 regulations, explained",
    standfirst: "Smaller, lighter cars, 50/50 hybrid power and active aerodynamics — the biggest rules reset in a generation.",
    category: "technical",
    tags: ["regulations", "2026-season"],
    body: [
      "The 2026 season introduced the most sweeping technical changes Formula 1 has seen in decades. The new power units split output almost evenly between the internal-combustion engine and electrical power, running on fully sustainable fuels.",
      { h: "Active aero and lighter cars" },
      "The cars are shorter, narrower and lighter, with active front and rear wings that switch between low-drag and high-downforce modes. The old DRS overtaking aid has been replaced by a manual energy-deployment override for the chasing driver.",
      { h: "A bigger grid" },
      "The rules reset coincided with an expanded field: eleven teams now contest the championship, with new works entries bringing fresh power-unit manufacturers into the sport.",
    ],
  },
  {
    slug: "sprint-weekend-format-guide",
    title: "What is a sprint weekend? The format, explained",
    standfirst: "One practice session, two qualifying sessions, two races — how the condensed format works.",
    category: "explainer",
    tags: ["sprint", "guide"],
    body: [
      "Six race weekends each season run to the sprint format. Friday packs free practice and sprint qualifying into a single day; Saturday opens with the 100km sprint race before traditional qualifying sets the Grand Prix grid; Sunday remains race day.",
      { h: "Points on Saturday" },
      "The sprint awards points to the top eight finishers — 8, 7, 6, 5, 4, 3, 2, 1 — meaning a perfect sprint weekend is worth 33 points before the lights even go out on Sunday.",
      "Sprint weekends put a premium on arriving with a well-sorted car: with only one hour of practice, set-up mistakes get locked in by parc fermé rules.",
    ],
  },
  {
    slug: "circuit-guide-monaco",
    title: "Circuit guide: why Monaco remains the ultimate test",
    standfirst: "The slowest lap of the year is still the one every driver wants to master.",
    category: "feature",
    tags: ["monaco", "guide"],
    body: [
      "At 3.337 kilometres, Monaco is the shortest lap on the calendar, threading between barriers that have barely moved since the 1950s. Average speeds are the lowest of the season; the margin for error is the smallest.",
      { h: "Qualifying is everything" },
      "Overtaking on track is nearly impossible, which turns Saturday afternoon into the real race. A driver who conjures a lap half a tenth quicker than his car deserves wins more at Monaco than anywhere else.",
      "From Sainte Dévote to the tunnel exit and the swimming-pool complex, no other circuit punishes a moment's inattention so completely — and no other trophy means quite as much.",
    ],
  },
  {
    slug: "anatomy-of-a-pit-stop",
    title: "Anatomy of a two-second pit stop",
    standfirst: "Twenty people, four wheels, and less time than it takes to read this sentence.",
    category: "technical",
    tags: ["pit-stops", "guide"],
    body: [
      "A modern Formula 1 pit stop is the most tightly choreographed act in sport. From the moment the car stops on its marks, three crew members per corner — gunner, wheel-off, wheel-on — execute a sequence rehearsed thousands of times.",
      { h: "Where stops are won and lost" },
      "The gun hits the nut before the car has finished settling; the jack drops as the last wheel torques home. Elite crews complete the whole cycle in around two seconds, and races are regularly decided by tenths gained or lost in the pit lane.",
      "Strategy teams model every stop against traffic, tyre degradation and safety-car probability — the call to box is as much a weapon as the fastest lap.",
    ],
  },
  {
    slug: "race-weekend-101",
    title: "Race weekends 101: from FP1 to the chequered flag",
    standfirst: "New to the sport? Here's exactly what happens across a Grand Prix weekend.",
    category: "explainer",
    tags: ["guide", "formula-1"],
    body: [
      "A standard Grand Prix weekend runs across three days. Friday's two free practice sessions let teams evaluate set-up and tyre behaviour; Saturday's final practice leads into qualifying; Sunday is the race.",
      { h: "How qualifying works" },
      "Qualifying is a knockout across three segments. Q1 eliminates the slowest five cars, Q2 the next five, and Q3 is a ten-car shootout for pole position. Track evolution and traffic management make the timing of each run critical.",
      "On Sunday, strategy comes to the fore: pit windows, tyre compound choices and the ever-present threat of a safety car decide races as often as raw pace does.",
    ],
  },
  {
    slug: "eleven-teams-2026-grid",
    title: "Eleven teams, one championship: the 2026 grid at a glance",
    standfirst: "The biggest grid in years — every team and where they came from.",
    category: "feature",
    tags: ["2026-season", "formula-1"],
    body: [
      "For the first time in a decade the grid has grown: eleven teams and twenty-two cars contest the 2026 championship across a 23-round calendar.",
      { h: "New names, familiar bones" },
      "Cadillac arrives as an all-new works entry, while Audi completes its long-planned transformation of the Hinwil operation formerly known as Sauber. Both join a field in which every point is fought over by more cars than at any time in recent memory.",
      "Follow every team's season — drivers, car specifications and results — on the Teams pages, updated after every session.",
    ],
  },
];

export async function seedContent(db: Db) {
  console.log("\nSeeding content…");

  /* categories + tags */
  await db.insert(articleCategories).values(CATEGORIES).onConflictDoNothing();
  await db
    .insert(tags)
    .values(TAGS.map((t) => ({ slug: t, name: t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) })))
    .onConflictDoNothing();

  const catRows = await db.select().from(articleCategories);
  const tagRows = await db.select().from(tags);
  const catId = new Map(catRows.map((c) => [c.slug, c.id]));
  const tagId = new Map(tagRows.map((t) => [t.slug, t.id]));

  /* articles (don't clobber CMS edits on re-run) */
  let published = Date.now() - ARTICLES.length * 36e5;
  for (const a of ARTICLES) {
    const { json, html } = buildBody(a.body);
    const [row] = await db
      .insert(articles)
      .values({
        slug: a.slug,
        title: a.title,
        standfirst: a.standfirst,
        categoryId: catId.get(a.category) ?? null,
        body: json,
        bodyHtml: html,
        status: "published",
        publishedAt: new Date((published += 36e5)),
        isBreaking: a.isBreaking ?? false,
        authorNameOverride: "CTR Sports Staff",
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

  /* sample videos — drafts until an admin sets real YouTube IDs */
  const VIDEOS = [
    { slug: "race-highlights-sample", title: "Race highlights (sample)" },
    { slug: "onboard-lap-sample", title: "Onboard hot lap (sample)" },
    { slug: "press-conference-sample", title: "Post-race press conference (sample)" },
    { slug: "tech-talk-sample", title: "Tech talk: front wing design (sample)" },
  ];
  for (const v of VIDEOS) {
    await db
      .insert(videos)
      .values({
        slug: v.slug,
        title: v.title,
        description: "Sample video — set a YouTube video ID in the CMS and publish.",
        provider: "youtube",
        status: "draft",
      })
      .onConflictDoNothing();
  }

  /* CMS pages with blocks */
  const PAGES: {
    slug: string;
    title: string;
    blocks: { type: "hero" | "rich_text" | "cta" | "sponsor_grid"; data: Record<string, unknown> }[];
  }[] = [
    {
      slug: "about",
      title: "About CTR Sports",
      blocks: [
        { type: "hero", data: { heading: "About CTR Sports", sub: "Independent coverage of Formula Racing" } },
        {
          type: "rich_text",
          data: {
            html: "<p>CTR Sports is an independent motorsport publication covering the Formula Racing world championship — every session, every result, every story. Our standings and statistics are computed directly from official session classifications.</p><p>This site is a fan project and is not associated with Formula 1 companies. F1® and related marks are trademarks of Formula One Licensing B.V.</p>",
          },
        },
      ],
    },
    {
      slug: "hospitality",
      title: "Hospitality & Experiences",
      blocks: [
        { type: "hero", data: { heading: "Race Weekend Hospitality", sub: "Trackside experiences at every Grand Prix" } },
        {
          type: "rich_text",
          data: {
            html: "<p>From grandstand packages to full paddock-style hospitality, race weekends offer experiences for every kind of fan: pit-lane walks, guided garage tours, and premium trackside dining with the best views of the circuit.</p><h2>What's included</h2><p>Packages typically combine reserved seating, dedicated hospitality suites, open bars and fine dining, appearances by drivers and team personnel, and after-race access to the podium celebrations where the schedule allows.</p>",
          },
        },
        { type: "cta", data: { heading: "Plan your race weekend", buttonLabel: "Browse the schedule", href: "/schedule" } },
      ],
    },
    {
      slug: "sponsors",
      title: "Partners",
      blocks: [
        { type: "hero", data: { heading: "Our Partners", sub: "The brands that power the championship" } },
        { type: "sponsor_grid", data: {} },
      ],
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      blocks: [
        {
          type: "rich_text",
          data: {
            html: "<h2>Privacy Policy</h2><p>We collect only the information needed to run fan accounts and the newsletter: an email address, a display name and your saved preferences. We never sell personal data.</p><p>You can delete your account at any time from the account page; this removes your personal data from our systems. Newsletter emails include a one-click unsubscribe link.</p>",
          },
        },
      ],
    },
    {
      slug: "terms-of-use",
      title: "Terms of Use",
      blocks: [
        {
          type: "rich_text",
          data: {
            html: "<h2>Terms of Use</h2><p>By using this site you agree to use it lawfully and respectfully. Content is provided for personal, non-commercial use. Statistics are computed from published session classifications and provided without warranty.</p>",
          },
        },
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
      await db
        .insert(contentBlocks)
        .values(p.blocks.map((b, i) => ({ pageId: row.id, type: b.type, sort: i, data: b.data })));
    }
  }
  console.log(`  ${PAGES.length} pages`);

  /* sponsors */
  const SPONSORS: { name: string; tier: "global_partner" | "official_partner" }[] = [
    { name: "Pirelli", tier: "global_partner" },
    { name: "Aramco", tier: "global_partner" },
    { name: "Qatar Airways", tier: "global_partner" },
    { name: "TAG Heuer", tier: "global_partner" },
    { name: "Heineken 0.0", tier: "official_partner" },
    { name: "DHL", tier: "official_partner" },
    { name: "Lenovo", tier: "official_partner" },
    { name: "MSC Cruises", tier: "official_partner" },
    { name: "Salesforce", tier: "official_partner" },
    { name: "AWS", tier: "official_partner" },
  ];
  const existingSponsors = await db.select({ name: sponsors.name }).from(sponsors);
  const have = new Set(existingSponsors.map((s) => s.name));
  const newSponsors = SPONSORS.filter((s) => !have.has(s.name)).map((s, i) => ({ ...s, sort: i }));
  if (newSponsors.length) await db.insert(sponsors).values(newSponsors);

  /* site settings */
  const SETTINGS: { key: string; value: unknown; description: string }[] = [
    { key: "current_season", value: { year: 2026 }, description: "Season shown by default across the site" },
    {
      key: "nav_links",
      value: [
        { label: "Latest", href: "/latest" },
        { label: "Video", href: "/video" },
        { label: "Schedule", href: "/schedule" },
        { label: "Results", href: "/results/2026" },
        { label: "Standings", href: "/standings/2026/drivers" },
        { label: "Drivers", href: "/drivers" },
        { label: "Teams", href: "/teams" },
      ],
      description: "Main site navigation",
    },
    {
      key: "social_links",
      value: [
        { platform: "x", url: "#" },
        { platform: "instagram", url: "#" },
        { platform: "youtube", url: "#" },
        { platform: "tiktok", url: "#" },
      ],
      description: "Social icons in the footer",
    },
    {
      key: "footer_links",
      value: [
        {
          group: "Explore",
          links: [
            { label: "Latest News", href: "/latest" },
            { label: "Schedule", href: "/schedule" },
            { label: "Standings", href: "/standings/2026/drivers" },
            { label: "Drivers", href: "/drivers" },
            { label: "Teams", href: "/teams" },
          ],
        },
        {
          group: "More",
          links: [
            { label: "About", href: "/about" },
            { label: "Hospitality", href: "/hospitality" },
            { label: "Partners", href: "/sponsors" },
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
      value: { enabled: false, text: "", href: "" },
      description: "Dismissable banner above the main nav",
    },
  ];
  for (const s of SETTINGS) {
    await db.insert(siteSettings).values(s).onConflictDoNothing();
  }

  /* sample poll from live standings */
  const top5 = await db
    .select({ driverId: driverStandings.driverId })
    .from(driverStandings)
    .where(eq(driverStandings.seasonYear, 2026))
    .orderBy(driverStandings.position)
    .limit(5);
  if (top5.length) {
    const [poll] = await db
      .insert(polls)
      .values({
        slug: "2026-title-prediction",
        question: "Who wins the 2026 Drivers' Championship?",
        kind: "prediction",
        status: "open",
        opensAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: polls.id });
    if (poll) {
      const names = await db.select().from(drivers);
      const nameById = new Map(names.map((d) => [d.id, `${d.firstName} ${d.lastName}`]));
      await db.insert(pollOptions).values(
        top5.map((t, i) => ({
          pollId: poll.id,
          label: nameById.get(t.driverId) ?? "Driver",
          driverId: t.driverId,
          sort: i,
        })),
      );
    }
  }

  console.log("  sponsors, settings, poll ✓");
}
