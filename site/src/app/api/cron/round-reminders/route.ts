import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { db, fans, raceSessions, roundRsvps, rounds } from "@ctr/db";
import { roundReminderEmail, sendEmail } from "@ctr/email";
import { formatDate } from "@/components/racing/meta";

export const dynamic = "force-dynamic";

/**
 * Pre-weekend RSVP reminders: emails every fan who RSVP'd "going"/"maybe" to
 * a round whose first session starts within the next 48 hours.
 *
 * IDEMPOTENT under any trigger cadence — each round is claimed exactly once
 * via a conditional update on rounds.reminder_sent_at (the OpenLeague
 * "conditional updateMany instead of read-then-write" pattern), so it is safe
 * to invoke this hourly from GitHub Actions, once daily from a Vercel Hobby
 * cron, from cron-job.org, or from all of them at once.
 *
 * Fail-closed auth (also from OpenLeague): a missing CRON_SECRET refuses to
 * run rather than letting anyone trigger mass email. Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>` automatically when that env var is
 * set on the project.
 */

const LOOKAHEAD_HOURS = 48;

function authorized(req: Request): boolean | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // not configured — refuse
  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const auth = authorized(req);
  if (auth === null) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
  }
  if (!auth) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const now = new Date();
  const windowEnd = new Date(now.getTime() + LOOKAHEAD_HOURS * 3600_000);

  // sessions starting inside the window → candidate rounds
  const windowSessions = await db.query.raceSessions.findMany({
    where: and(gte(raceSessions.startsAt, now), lt(raceSessions.startsAt, windowEnd)),
    columns: { roundId: true },
  });
  const candidateRoundIds = [...new Set(windowSessions.map((s) => s.roundId))];
  if (!candidateRoundIds.length) return NextResponse.json({ rounds: 0, sent: 0, failed: 0 });

  const base = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  let sent = 0;
  let failed = 0;
  let claimed = 0;

  for (const roundId of candidateRoundIds) {
    // remind off the round's FIRST session — one reminder per weekend — and
    // skip rounds whose weekend is already underway (first session in the past)
    const first = await db.query.raceSessions.findFirst({
      where: eq(raceSessions.roundId, roundId),
      orderBy: (s, { asc }) => [asc(s.startsAt)],
      with: {
        round: {
          with: {
            circuit: { columns: { name: true, locality: true, country: true } },
            championshipSeason: { columns: { year: true } },
          },
        },
      },
    });
    if (!first?.startsAt || first.startsAt < now || first.startsAt >= windowEnd) continue;
    if (first.round.status === "cancelled") continue;

    // claim the round — concurrency-safe: only one invocation wins
    const won = await db
      .update(rounds)
      .set({ reminderSentAt: now })
      .where(and(eq(rounds.id, roundId), isNull(rounds.reminderSentAt)))
      .returning({ id: rounds.id });
    if (!won.length) continue; // already reminded (or another run claimed it)
    claimed += 1;

    const round = first.round;
    const circuitLine = [round.circuit.name, round.circuit.locality, round.circuit.country]
      .filter(Boolean)
      .join(", ");
    const roundUrl = `${base}/schedule/${round.championshipSeason.year}/${round.slug}`;
    const firstSessionLine = `first session ${formatDate(
      first.startsAt.toISOString(),
      "EEE d MMM",
    )} (IST)`;

    const attendees = await db
      .select({ email: fans.email, displayName: fans.displayName })
      .from(roundRsvps)
      .innerJoin(fans, eq(roundRsvps.fanId, fans.id))
      .where(
        and(
          eq(roundRsvps.roundId, roundId),
          inArray(roundRsvps.status, ["going", "maybe"]),
          isNull(fans.deactivatedAt),
        ),
      );

    // individually try/caught so one bad address never aborts the sweep
    for (const fan of attendees) {
      try {
        await sendEmail({
          to: fan.email,
          ...roundReminderEmail({
            fanName: fan.displayName,
            roundName: round.name,
            circuitLine,
            firstSessionLine,
            roundUrl,
          }),
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error(`round reminder failed for ${fan.email}`, err);
      }
    }
  }

  return NextResponse.json({ rounds: claimed, sent, failed });
}
