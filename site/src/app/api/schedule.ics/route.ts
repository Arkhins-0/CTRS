import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { championships, championshipSeasons, db, rounds } from "@ctr/db";
import { buildIcs, type IcsEvent } from "@ctr/email";
import { HOME_CHAMPIONSHIP } from "@/components/racing/data";
import { isSessionType, sessionDisplayLabel } from "@/components/racing/meta";

export const dynamic = "force-dynamic";

/**
 * Public season calendar: GET /api/schedule.ics?year=2026[&round=<slug>].
 * One VEVENT per timetabled session; without ?round the whole season is
 * included. ICS building adapted from OpenLeague's schedule export.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const year = Number.parseInt(url.searchParams.get("year") ?? "", 10);
  const roundSlug = url.searchParams.get("round");
  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: "Pass ?year=YYYY." }, { status: 400 });
  }

  const [season] = await db
    .select({ id: championshipSeasons.id, shortName: championships.shortName })
    .from(championshipSeasons)
    .innerJoin(championships, eq(championshipSeasons.championshipId, championships.id))
    .where(and(eq(championships.slug, HOME_CHAMPIONSHIP), eq(championshipSeasons.year, year)));
  if (!season) return NextResponse.json({ error: "Season not found." }, { status: 404 });

  const gps = await db.query.rounds.findMany({
    where: and(
      eq(rounds.championshipSeasonId, season.id),
      roundSlug ? eq(rounds.slug, roundSlug) : undefined,
    ),
    orderBy: (r, { asc }) => [asc(r.round)],
    with: {
      circuit: { columns: { name: true, locality: true, country: true } },
      sessions: { with: { category: { columns: { shortName: true } } } },
    },
  });
  if (roundSlug && !gps.length) {
    return NextResponse.json({ error: "Round not found." }, { status: 404 });
  }

  const base = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  const events: IcsEvent[] = [];
  for (const gp of gps) {
    const location = [gp.circuit.name, gp.circuit.locality, gp.circuit.country]
      .filter(Boolean)
      .join(", ");
    for (const s of gp.sessions) {
      if (!s.startsAt || s.status === "cancelled") continue;
      const label = sessionDisplayLabel({
        type: isSessionType(s.type) ? s.type : "race",
        label: s.label,
        sequence: s.sequence,
      });
      events.push({
        uid: `session-${s.id}@ctrsports`,
        title: `${gp.name} — ${label}${s.category ? ` (${s.category.shortName})` : ""}`,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt ? s.endsAt.toISOString() : null,
        location,
        description: `Round ${gp.round} · ${season.shortName} ${year}`,
        url: `${base}/schedule/${year}/${gp.slug}`,
      });
    }
  }

  const calendarName = roundSlug
    ? `${gps[0].name} · ${season.shortName} ${year}`
    : `${season.shortName} ${year} — Race Calendar`;
  const ics = buildIcs(events, { calendarName, defaultDurationMinutes: 60 });
  const filename = roundSlug ? `${roundSlug}-${year}.ics` : `${HOME_CHAMPIONSHIP}-${year}.ics`;

  return new NextResponse(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "public, max-age=3600",
    },
  });
}
