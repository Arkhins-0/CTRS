import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { getISOWeek, getISOWeekYear } from "date-fns";
import {
  articles,
  championshipSeasons,
  circuits,
  db,
  driverSeasonEntries,
  driverStandings,
  newsletterSubscribers,
  raceCategories,
  rounds,
  sponsors,
} from "@ctr/db";
import {
  newsletterDigestEmail,
  sendEmail,
  type NewsCard,
  type SocialLink,
  type StandingRow,
} from "@ctr/email";
import { formatDate } from "@/components/racing/meta";
import { mediaUrl } from "@/lib/media";
import { authorizedCronRequest } from "@/lib/cron-auth";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Weekly "Pit Wall" digest — the newsletter double-opt-in confirmation email
 * has always promised "one email per race week with the schedule, results
 * and standings"; nothing implemented that promise until this route.
 *
 * IDEMPOTENT under any trigger cadence, same principle as round-reminders:
 * the ISO week ("2026-W36") is claimed with a single INSERT ... ON CONFLICT
 * DO NOTHING against newsletter_issues' partial unique index BEFORE any
 * content is built or any mail sent, so an overlapping Vercel + GitHub
 * Actions + cron-job.org trigger can only ever produce one issue per week.
 */

/** 800px derived rendition — see admin/src/components/media/variants.ts. The
 *  admin app owns that helper; this is the same 4-line algorithm, kept local
 *  rather than pulled into a shared package for one call site. */
function cardVariant(path: string): string {
  const dot = path.lastIndexOf(".");
  const suffixed = dot === -1 ? `${path}_card` : `${path.slice(0, dot)}_card${path.slice(dot)}`;
  return mediaUrl(suffixed) ?? "";
}

export async function GET(req: Request) {
  const auth = authorizedCronRequest(req);
  if (auth === null) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
  }
  if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const now = new Date();
  const periodKey = `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, "0")}`;
  const editionLine = `WEEKLY DIGEST · ${formatDate(now.toISOString(), "d MMM yyyy")}`;

  // Claim the week BEFORE building anything — see module doc.
  const claim = await db.execute<{ id: string }>(sql`
    INSERT INTO newsletter_issues (kind, subject, period_key, status)
    VALUES ('digest', ${"The Pit Wall — " + editionLine}, ${periodKey}, 'sending')
    ON CONFLICT (period_key) WHERE kind = 'digest' AND period_key IS NOT NULL DO NOTHING
    RETURNING id
  `);
  const issueId = claim.rows[0]?.id as string | undefined;
  if (!issueId) return NextResponse.json({ claimed: false, periodKey });

  const base = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  const today = now.toISOString().slice(0, 10);

  // Next (or currently underway) round of whichever season is marked current.
  const nextRound = await db.query.rounds.findFirst({
    where: (r, { and: whereAnd, eq: whereEq, or: whereOr, isNull: whereIsNull, gte: whereGte }) =>
      whereAnd(
        whereEq(r.status, "scheduled"),
        whereOr(whereIsNull(r.endDate), whereGte(r.endDate, today)),
      ),
    orderBy: (r, { asc: orderAsc }) => [orderAsc(r.startDate)],
    with: {
      circuit: { columns: { name: true, locality: true, country: true } },
      championshipSeason: { columns: { id: true, year: true, isCurrent: true, championshipId: true } },
      heroImage: { columns: { path: true } },
    },
  });
  const currentRound = nextRound?.championshipSeason.isCurrent ? nextRound : undefined;

  let driverRows: StandingRow[] = [];
  let constructorRows: StandingRow[] = [];
  let category: { id: string } | undefined;

  if (currentRound) {
    const [cat] = await db
      .select({ id: raceCategories.id })
      .from(raceCategories)
      .where(
        and(
          eq(raceCategories.championshipId, currentRound.championshipSeason.championshipId),
          eq(raceCategories.isActive, true),
        ),
      )
      .orderBy(asc(raceCategories.sort))
      .limit(1);
    category = cat;
  }

  if (currentRound && category) {
    const seasonId = currentRound.championshipSeason.id;

    const [standings, entries, cRows] = await Promise.all([
      db.query.driverStandings.findMany({
        where: (s, { and: whereAnd, eq: whereEq }) =>
          whereAnd(
            whereEq(s.championshipSeasonId, seasonId),
            whereEq(s.categoryId, category.id),
            whereEq(s.standingsType, "overall"),
          ),
        orderBy: (s, { asc: orderAsc }) => [orderAsc(s.position)],
        with: { driver: { columns: { firstName: true, lastName: true } } },
        limit: 3,
      }),
      db.query.driverSeasonEntries.findMany({
        where: (e, { and: whereAnd, eq: whereEq }) =>
          whereAnd(whereEq(e.championshipSeasonId, seasonId), whereEq(e.categoryId, category.id)),
        with: { teamSeasonEntry: { columns: { shortName: true } } },
      }),
      db.query.constructorStandings.findMany({
        where: (s, { and: whereAnd, eq: whereEq }) =>
          whereAnd(
            whereEq(s.championshipSeasonId, seasonId),
            whereEq(s.categoryId, category.id),
            whereEq(s.standingsType, "team"),
          ),
        orderBy: (s, { asc: orderAsc }) => [orderAsc(s.position)],
        with: { teamSeasonEntry: { columns: { displayName: true } } },
        limit: 3,
      }),
    ]);

    // First matching entry is good enough for a newsletter blurb — the exact
    // "which team as of which round" edge case belongs to the standings page,
    // not this summary.
    const teamByDriver = new Map<string, string>();
    for (const e of entries) {
      if (!teamByDriver.has(e.driverId)) teamByDriver.set(e.driverId, e.teamSeasonEntry.shortName);
    }

    driverRows = standings.map((s) => ({
      position: s.position,
      name: `${s.driver.firstName} ${s.driver.lastName}`,
      sub: teamByDriver.get(s.driverId) ?? "",
      points: s.points,
    }));
    constructorRows = cRows.map((s) => ({
      position: s.position,
      name: s.teamSeasonEntry.displayName,
      sub: "",
      points: s.points,
    }));
  }

  // Latest published news, 3 cards.
  const latest = await db.query.articles.findMany({
    where: (a, { eq: whereEq }) => whereEq(a.status, "published"),
    orderBy: (a, { desc: orderDesc }) => [orderDesc(a.publishedAt)],
    limit: 3,
    columns: { slug: true, title: true, standfirst: true },
    with: {
      hero: { columns: { path: true } },
      category: { columns: { name: true } },
    },
  });
  const news: NewsCard[] = latest.map((a) => ({
    title: a.title,
    url: `${base}/latest/article/${a.slug}`,
    imageUrl: a.hero ? cardVariant(a.hero.path) : null,
    category: a.category?.name ?? null,
    standfirst: (a.standfirst ?? "").slice(0, 140),
  }));

  const activeSponsors = await db.query.sponsors.findMany({
    where: (s, { eq: whereEq }) => whereEq(s.isActive, true),
    orderBy: (s, { asc: orderAsc }) => [orderAsc(s.sort)],
    limit: 6,
    columns: { name: true, url: true },
    with: { logo: { columns: { path: true } } },
  });
  const sponsorLogos = activeSponsors
    .filter((s): s is typeof s & { logo: { path: string } } => Boolean(s.logo))
    .map((s) => ({ name: s.name, url: s.url ?? base, logoUrl: cardVariant(s.logo.path) }));

  const socialLinks = await getSetting<SocialLink[]>("social_links", []);

  const isEmpty = !currentRound && news.length === 0 && driverRows.length === 0 && constructorRows.length === 0;

  let sent = 0;
  let failed = 0;
  let representativeHtml = "";
  let representativeSubject = "The Pit Wall — this week at CTR Sports";

  if (!isEmpty) {
    // Confirmed subscribers, backfilling any missing unsubscribe token first
    // so every send below has a working one-click link.
    const missing = await db
      .select({ id: newsletterSubscribers.id })
      .from(newsletterSubscribers)
      .where(
        and(
          eq(newsletterSubscribers.status, "confirmed"),
          isNull(newsletterSubscribers.unsubscribeToken),
        ),
      );
    for (const row of missing) {
      await db
        .update(newsletterSubscribers)
        .set({ unsubscribeToken: randomBytes(24).toString("hex") })
        .where(eq(newsletterSubscribers.id, row.id));
    }

    const recipients = await db
      .select({ email: newsletterSubscribers.email, token: newsletterSubscribers.unsubscribeToken })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, "confirmed"));

    const digestInput = {
      editionLine,
      hero: currentRound
        ? {
            roundName: currentRound.name,
            circuitLine: [currentRound.circuit.name, currentRound.circuit.locality, currentRound.circuit.country]
              .filter(Boolean)
              .join(", "),
            dateLine: currentRound.startDate
              ? formatDate(currentRound.startDate, "d MMM") +
                (currentRound.endDate && currentRound.endDate !== currentRound.startDate
                  ? `–${formatDate(currentRound.endDate, "d MMM yyyy")}`
                  : ` ${formatDate(currentRound.startDate, "yyyy")}`)
              : "Date TBC",
            teaser: "Race week is here — here's what's on the line before lights out.",
            imageUrl: currentRound.heroImage ? cardVariant(currentRound.heroImage.path) : null,
            scheduleUrl: `${base}/schedule/${currentRound.championshipSeason.year}/${currentRound.slug}`,
          }
        : null,
      news,
      driverStandings: driverRows,
      constructorStandings: constructorRows,
      sponsors: sponsorLogos,
      socialLinks,
      webUrl: base,
    };

    for (const r of recipients) {
      const unsubscribeUrl = `${base}/newsletter/unsubscribe/${r.token}`;
      const rendered = newsletterDigestEmail({ ...digestInput, unsubscribeUrl });
      representativeSubject = rendered.subject;
      if (!representativeHtml) {
        representativeHtml = newsletterDigestEmail({
          ...digestInput,
          unsubscribeUrl: `${base}/newsletter/unsubscribe/{token}`,
        }).html;
      }
      try {
        await sendEmail({ to: r.email, subject: rendered.subject, html: rendered.html, text: rendered.text });
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error(`newsletter digest failed for ${r.email}`, err);
      }
    }
  }

  await db.execute(sql`
    UPDATE newsletter_issues
    SET status = 'sent', subject = ${representativeSubject}, sent_html = ${representativeHtml || null},
        sent_at = now(), sent_count = ${sent}, failed_count = ${failed}
    WHERE id = ${issueId}
  `);

  return NextResponse.json({ claimed: true, periodKey, sent, failed, empty: isEmpty });
}
