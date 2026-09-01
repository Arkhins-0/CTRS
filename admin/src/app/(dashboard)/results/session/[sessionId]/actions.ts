"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  computeStandings,
  db,
  parseTimeToMs,
  raceSessions,
  rounds,
  sessionResults,
  PERMISSIONS,
  TAGS,
} from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";
import {
  isQualiLike,
  isRaceLike,
  isRowTouched,
  type GridRow,
  type SessionKind,
} from "@/components/results/types";

const rowSchema = z.object({
  entryId: z.string().uuid(),
  carNumber: z.number().int(),
  driverName: z.string(),
  driverCode: z.string(),
  teamName: z.string(),
  teamColor: z.string(),
  position: z.number().int().min(1).max(60).nullable(),
  gridPosition: z.number().int().min(0).max(60).nullable(),
  laps: z.number().int().min(0).max(500).nullable(),
  timeText: z.string().max(24),
  gapText: z.string().max(24),
  q1Text: z.string().max(24),
  q2Text: z.string().max(24),
  q3Text: z.string().max(24),
  status: z.enum(["finished", "dnf", "dns", "dsq", "nc"]),
  points: z.number().min(0).max(200),
  fastestLap: z.boolean(),
  fastestLapText: z.string().max(24),
});

const payloadSchema = z.object({
  sessionId: z.string().uuid(),
  rows: z.array(rowSchema).min(1),
});

/** '+5.848' → gapMs; '+2 laps' → lapsBehind; also accepts '1:05.123' style gaps. */
function parseGapText(text: string): { gapMs: number | null; lapsBehind: number | null } {
  const t = text.trim().replace(/^\+/, "");
  if (!t) return { gapMs: null, lapsBehind: null };
  const lapMatch = t.match(/^(\d+)\s*laps?$/i);
  if (lapMatch) return { gapMs: null, lapsBehind: Number(lapMatch[1]) };
  if (t.includes(":")) return { gapMs: parseTimeToMs(t), lapsBehind: null };
  const seconds = Number.parseFloat(t.replace(/s$/i, ""));
  if (Number.isFinite(seconds)) return { gapMs: Math.round(seconds * 1000), lapsBehind: null };
  return { gapMs: null, lapsBehind: null };
}

function toInsertValues(
  sessionId: string,
  sessionType: SessionKind,
  row: GridRow,
): typeof sessionResults.$inferInsert {
  const base = {
    sessionId,
    driverSeasonEntryId: row.entryId,
    position: row.position,
    status: row.status,
  };

  if (isRaceLike(sessionType)) {
    const { gapMs, lapsBehind } = parseGapText(row.gapText);
    const winner = row.position === 1;
    return {
      ...base,
      gridPosition: row.gridPosition,
      laps: row.laps,
      timeMs: winner ? parseTimeToMs(row.timeText.trim()) : null,
      gapMs: winner ? null : gapMs,
      lapsBehind: winner ? null : lapsBehind,
      points: row.points,
      fastestLap: row.fastestLap,
      // Only meaningful on the row that actually set it — storing a time
      // against an unflagged row would leave two competing "fastest" laps.
      fastestLapTimeMs: row.fastestLap ? parseTimeToMs(row.fastestLapText.trim()) : null,
    };
  }

  if (isQualiLike(sessionType)) {
    return {
      ...base,
      q1TimeMs: parseTimeToMs(row.q1Text.trim()),
      q2TimeMs: parseTimeToMs(row.q2Text.trim()),
      q3TimeMs: parseTimeToMs(row.q3Text.trim()),
      points: 0,
    };
  }

  // practice
  return {
    ...base,
    timeMs: parseTimeToMs(row.timeText.trim()),
    laps: row.laps,
    points: 0,
  };
}

async function saveResults(formData: FormData, complete: boolean) {
  const admin = await requirePermission(PERMISSIONS.RESULTS_MANAGE);

  const rawRows = formData.get("rows");
  const { sessionId, rows } = payloadSchema.parse({
    sessionId: typeof formData.get("sessionId") === "string" ? formData.get("sessionId") : "",
    rows: typeof rawRows === "string" ? JSON.parse(rawRows) : [],
  });

  const session = await db.query.raceSessions.findFirst({
    where: eq(raceSessions.id, sessionId),
    with: { round: true },
  });
  if (!session) redirect("/results");
  const round = session.round;
  // the retired "race2" enum value can still exist on legacy rows — treat as a race
  const sessionKind: SessionKind = session.type === "race2" ? "race" : session.type;

  // Rows the editor never touched (e.g. a reserve who sat out) are skipped.
  const values = rows.filter(isRowTouched).map((r) => toInsertValues(sessionId, sessionKind, r));

  await db.transaction(async (tx) => {
    await tx.delete(sessionResults).where(eq(sessionResults.sessionId, sessionId));
    if (values.length) await tx.insert(sessionResults).values(values);
    if (complete) {
      await tx.update(raceSessions).set({ status: "completed" }).where(eq(raceSessions.id, sessionId));
      if (sessionKind === "race") {
        await tx.update(rounds).set({ status: "completed" }).where(eq(rounds.id, round.id));
      }
    }
  });

  if (complete) await computeStandings(db, round.championshipSeasonId);

  await writeAudit({
    actorId: admin.user.id,
    action: complete ? "results.publish" : "results.save",
    entityType: "race_session",
    entityId: sessionId,
    diff: { rows: values.length },
  });
  await revalidateSite([
    TAGS.results,
    TAGS.resultsSession(sessionId),
    TAGS.standings,
    TAGS.schedule,
    TAGS.gp(round.id),
    TAGS.home,
    TAGS.drivers,
    TAGS.teams,
  ]);
  revalidatePath("/results");
  revalidatePath("/standings");
  revalidatePath(`/results/session/${sessionId}`);
  redirect(`/results/session/${sessionId}?saved=${complete ? "1" : "draft"}`);
}

/** Publish: replaces the classification, completes the session (and GP for a race), recomputes standings. */
export async function publishResultsAction(formData: FormData) {
  await saveResults(formData, true);
}

/** Draft save: replaces the classification but leaves statuses and standings untouched. */
export async function saveResultsDraftAction(formData: FormData) {
  await saveResults(formData, false);
}
