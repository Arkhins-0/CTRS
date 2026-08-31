import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, roundRsvps, rounds } from "@ctr/db";
import { rsvpConfirmationEmail, sendEmail } from "@ctr/email";
import { getFanSession } from "@/lib/fan-auth";
import { formatDateRange } from "@/components/racing/meta";

export const dynamic = "force-dynamic";

/**
 * Race-weekend attendance (adapted from OpenLeague's RSVP flow, simplified to
 * self-only responses). The round page stays fully cached — this route serves
 * the per-fan widget.
 *
 * GET  ?roundId=  → { counts, mine, signedIn }
 * POST { roundId, status: "going"|"maybe"|"not_going"|"clear" }
 */

const roundIdSchema = z.string().uuid();

async function attendanceCounts(roundId: string) {
  const rows = await db
    .select({ status: roundRsvps.status, n: sql<number>`count(*)::int` })
    .from(roundRsvps)
    .where(eq(roundRsvps.roundId, roundId))
    .groupBy(roundRsvps.status);
  const by = new Map(rows.map((r) => [r.status, r.n]));
  return {
    going: by.get("going") ?? 0,
    maybe: by.get("maybe") ?? 0,
    notGoing: by.get("not_going") ?? 0,
  };
}

export async function GET(req: Request) {
  const roundId = new URL(req.url).searchParams.get("roundId") ?? "";
  const parsed = roundIdSchema.safeParse(roundId);
  if (!parsed.success) return NextResponse.json({ error: "Invalid round id." }, { status: 400 });

  const session = await getFanSession();
  const [counts, mine] = await Promise.all([
    attendanceCounts(parsed.data),
    session
      ? db.query.roundRsvps.findFirst({
          where: and(
            eq(roundRsvps.roundId, parsed.data),
            eq(roundRsvps.fanId, session.fan.id),
          ),
          columns: { status: true },
        })
      : Promise.resolve(undefined),
  ]);

  return NextResponse.json({
    counts,
    mine: mine?.status ?? null,
    signedIn: Boolean(session),
  });
}

const postSchema = z.object({
  roundId: z.string().uuid(),
  status: z.enum(["going", "maybe", "not_going", "clear"]),
});

export async function POST(req: Request) {
  const session = await getFanSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to RSVP." }, { status: 401 });
  }

  let input: z.infer<typeof postSchema>;
  try {
    input = postSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const round = await db.query.rounds.findFirst({
    where: eq(rounds.id, input.roundId),
    with: {
      circuit: { columns: { name: true, locality: true, country: true } },
      championshipSeason: { columns: { year: true } },
    },
  });
  if (!round) return NextResponse.json({ error: "Round not found." }, { status: 404 });

  const previous = await db.query.roundRsvps.findFirst({
    where: and(eq(roundRsvps.roundId, round.id), eq(roundRsvps.fanId, session.fan.id)),
    columns: { status: true },
  });

  if (input.status === "clear") {
    await db
      .delete(roundRsvps)
      .where(and(eq(roundRsvps.roundId, round.id), eq(roundRsvps.fanId, session.fan.id)));
  } else {
    await db
      .insert(roundRsvps)
      .values({ roundId: round.id, fanId: session.fan.id, status: input.status })
      .onConflictDoUpdate({
        target: [roundRsvps.roundId, roundRsvps.fanId],
        set: { status: input.status, updatedAt: new Date() },
      });
  }

  // First switch to "going" gets a confirmation email with a calendar link.
  // Best-effort: an email failure must never fail the RSVP itself.
  if (input.status === "going" && previous?.status !== "going") {
    try {
      const base = (process.env.SITE_URL ?? "").replace(/\/$/, "");
      const year = round.championshipSeason.year;
      const circuitLine = [round.circuit.name, round.circuit.locality, round.circuit.country]
        .filter(Boolean)
        .join(", ");
      await sendEmail({
        to: session.fan.email,
        ...rsvpConfirmationEmail({
          fanName: session.fan.displayName,
          roundName: round.name,
          circuitLine,
          dateLine: formatDateRange(round.startDate, round.endDate),
          roundUrl: `${base}/schedule/${year}/${round.slug}`,
          calendarUrl: `${base}/api/schedule.ics?year=${year}&round=${round.slug}`,
        }),
      });
    } catch (err) {
      console.error("rsvp confirmation email failed", err);
    }
  }

  const counts = await attendanceCounts(round.id);
  return NextResponse.json({ counts, mine: input.status === "clear" ? null : input.status });
}
