"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, raceCategories, raceSessions, rounds, PERMISSIONS, TAGS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";

/* ── helpers ─────────────────────────────────────────────────────────────── */

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};
const numOrNull = (fd: FormData, key: string) => {
  const v = str(fd, key);
  return v === "" ? null : Number(v);
};

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const roundStatusSchema = z.enum(["scheduled", "live", "completed", "cancelled"]);
const sessionStatusSchema = z.enum(["scheduled", "live", "completed", "cancelled"]);
// "race2" is retired — a second race is type "race" with sequence 2.
const sessionTypeSchema = z.enum([
  "fp1",
  "fp2",
  "fp3",
  "sprint_qualifying",
  "sprint",
  "qualifying",
  "race",
]);

/** unique(round, categoryId, type, sequence) — surfaced as a friendly banner, not a crash. */
function isSessionUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; message?: string; cause?: unknown };
  if (e.code === "23505") return true;
  if (
    typeof e.message === "string" &&
    (e.message.includes("session_round_cat_type_seq_uq") || e.message.includes("duplicate key"))
  ) {
    return true;
  }
  return e.cause ? isSessionUniqueViolation(e.cause) : false;
}

const roundSchema = z.object({
  championshipSeasonId: z.string().uuid(),
  round: z.number().int().min(1).max(30),
  name: z.string().min(1).max(200),
  officialName: optionalText(255),
  circuitId: z.string().uuid(),
  startDate: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date"),
  endDate: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date"),
  hasSprint: z.boolean(),
  status: roundStatusSchema,
  heroMediaId: z.string().uuid().nullable(),
});

function roundFromForm(formData: FormData) {
  return roundSchema.parse({
    championshipSeasonId: str(formData, "championshipSeasonId"),
    round: numOrNull(formData, "round"),
    name: str(formData, "name"),
    officialName: str(formData, "officialName"),
    circuitId: str(formData, "circuitId"),
    startDate: str(formData, "startDate"),
    endDate: str(formData, "endDate"),
    hasSprint: formData.get("hasSprint") === "on",
    status: str(formData, "status"),
    heroMediaId: str(formData, "heroMediaId") || null,
  });
}

const roundTags = (id: string) => [TAGS.schedule, TAGS.gp(id), TAGS.home];

/* ── Round CRUD ──────────────────────────────────────────────────────────── */

export async function createGpAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const data = roundFromForm(formData);

  const [row] = await db
    .insert(rounds)
    .values({ ...data, slug: slugify(data.name) })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "round.create",
    entityType: "round",
    entityId: row.id,
    diff: { after: data },
  });
  await revalidateSite([TAGS.schedule, TAGS.home]);
  revalidatePath("/races");
  redirect(`/races/${row.id}`);
}

export async function updateGpAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const id = z.string().uuid().parse(str(formData, "id"));
  const data = roundFromForm(formData);

  await db
    .update(rounds)
    .set({ ...data, slug: slugify(data.name) })
    .where(eq(rounds.id, id));

  await writeAudit({
    actorId: session.user.id,
    action: "round.update",
    entityType: "round",
    entityId: id,
    diff: { after: data },
  });
  await revalidateSite(roundTags(id));
  revalidatePath("/races");
  revalidatePath(`/races/${id}`);
}

export async function deleteGpAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const id = z.string().uuid().parse(str(formData, "id"));

  const [gone] = await db.delete(rounds).where(eq(rounds.id, id)).returning();

  await writeAudit({
    actorId: session.user.id,
    action: "round.delete",
    entityType: "round",
    entityId: id,
    diff: {
      before: gone
        ? { name: gone.name, championshipSeasonId: gone.championshipSeasonId, round: gone.round }
        : null,
    },
  });
  await revalidateSite([...roundTags(id), TAGS.results, TAGS.standings]);
  revalidatePath("/races");
  redirect(`/races?season=${gone?.championshipSeasonId ?? ""}`);
}

/* ── Session management ──────────────────────────────────────────────────── */

const sessionFormSchema = z.object({
  roundId: z.string().uuid(),
  startsAt: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || !Number.isNaN(new Date(v).getTime()), "Invalid date/time"),
  categoryId: z.string().uuid().nullable(), // null = weekend-wide session
  /** Race 1 / Race 2 = type "race" sequence 1 / 2. */
  sequence: z.number().int().min(1).max(9),
  label: z
    .string()
    .max(120)
    .transform((v) => (v === "" ? null : v)),
});

function sessionFromForm(formData: FormData) {
  return sessionFormSchema.parse({
    roundId: str(formData, "roundId"),
    startsAt: str(formData, "startsAt"),
    categoryId: str(formData, "categoryId") || null,
    sequence: numOrNull(formData, "sequence") ?? 1,
    label: str(formData, "label"),
  });
}

export async function addSessionAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const { roundId, startsAt, categoryId, sequence, label } = sessionFromForm(formData);
  const type = sessionTypeSchema.parse(str(formData, "type"));

  let row: typeof raceSessions.$inferSelect;
  try {
    [row] = await db
      .insert(raceSessions)
      .values({
        roundId,
        type,
        sequence,
        categoryId,
        label,
        startsAt: startsAt ? new Date(startsAt) : null,
      })
      .returning();
  } catch (err) {
    if (isSessionUniqueViolation(err)) redirect(`/races/${roundId}?error=duplicate-session`);
    throw err;
  }

  await writeAudit({
    actorId: session.user.id,
    action: "round.session.create",
    entityType: "race_session",
    entityId: row.id,
    diff: { after: { type, sequence, categoryId, label, startsAt } },
  });
  await revalidateSite(roundTags(roundId));
  revalidatePath(`/races/${roundId}`);
}

export async function updateSessionAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const sessionId = z.string().uuid().parse(str(formData, "sessionId"));
  const { roundId, startsAt, categoryId, sequence, label } = sessionFromForm(formData);
  const status = sessionStatusSchema.parse(str(formData, "status"));

  try {
    await db
      .update(raceSessions)
      .set({ startsAt: startsAt ? new Date(startsAt) : null, status, categoryId, sequence, label })
      .where(eq(raceSessions.id, sessionId));
  } catch (err) {
    if (isSessionUniqueViolation(err)) redirect(`/races/${roundId}?error=duplicate-session`);
    throw err;
  }

  await writeAudit({
    actorId: session.user.id,
    action: "round.session.update",
    entityType: "race_session",
    entityId: sessionId,
    diff: { after: { startsAt, status, categoryId, sequence, label } },
  });
  await revalidateSite(roundTags(roundId));
  revalidatePath(`/races/${roundId}`);
}

export async function deleteSessionAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const sessionId = z.string().uuid().parse(str(formData, "sessionId"));
  const roundId = z.string().uuid().parse(str(formData, "roundId"));

  const [gone] = await db.delete(raceSessions).where(eq(raceSessions.id, sessionId)).returning();

  await writeAudit({
    actorId: session.user.id,
    action: "round.session.delete",
    entityType: "race_session",
    entityId: sessionId,
    diff: { before: gone ? { type: gone.type, sequence: gone.sequence } : null },
  });
  await revalidateSite([...roundTags(roundId), TAGS.results, TAGS.resultsSession(sessionId)]);
  revalidatePath(`/races/${roundId}`);
}

/**
 * INCRC weekend timetable — one session block per active category, back-to-back
 * slots in category-sort order. Times are IST (UTC+05:30) wall-clock on the
 * weekend days (day 0 = round start date = Friday, 1 = Saturday, 2 = Sunday).
 */
const INCRC_PLAN: {
  type: z.infer<typeof sessionTypeSchema>;
  sequence: number;
  labelSuffix: string;
  day: number;
  hour: number;
  minute: number;
  slotMinutes: number;
}[] = [
  { type: "fp1", sequence: 1, labelSuffix: "Practice", day: 0, hour: 8, minute: 30, slotMinutes: 40 },
  { type: "qualifying", sequence: 1, labelSuffix: "Qualifying", day: 0, hour: 14, minute: 0, slotMinutes: 30 },
  { type: "race", sequence: 1, labelSuffix: "Race 1", day: 1, hour: 9, minute: 30, slotMinutes: 45 },
  { type: "race", sequence: 2, labelSuffix: "Race 2", day: 2, hour: 9, minute: 30, slotMinutes: 45 },
];

const IST_OFFSET_MS = 330 * 60_000; // UTC+05:30

export async function generateWeekendAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const roundId = z.string().uuid().parse(str(formData, "roundId"));

  const [round, categories] = await Promise.all([
    db.query.rounds.findFirst({
      where: eq(rounds.id, roundId),
      with: { sessions: { columns: { type: true, sequence: true, categoryId: true } } },
    }),
    db
      .select()
      .from(raceCategories)
      .where(eq(raceCategories.isActive, true))
      .orderBy(asc(raceCategories.sort), asc(raceCategories.shortName)),
  ]);
  if (!round || !categories.length) return;

  const existing = new Set(
    round.sessions.map((s) => `${s.categoryId ?? ""}|${s.type}|${s.sequence}`),
  );
  const startParts = round.startDate?.split("-").map(Number);
  const hasBase = startParts?.length === 3 && startParts.every((n) => Number.isFinite(n));

  const values: (typeof raceSessions.$inferInsert)[] = [];
  for (const p of INCRC_PLAN) {
    categories.forEach((cat, slot) => {
      if (existing.has(`${cat.id}|${p.type}|${p.sequence}`)) return; // keep what already exists
      let startsAt: Date | null = null;
      let endsAt: Date | null = null;
      if (hasBase && startParts) {
        const [y, m, d] = startParts;
        const istWallClockUtc = Date.UTC(y, m - 1, d + p.day, p.hour, p.minute);
        startsAt = new Date(istWallClockUtc - IST_OFFSET_MS + slot * p.slotMinutes * 60_000);
        endsAt = new Date(startsAt.getTime() + p.slotMinutes * 60_000);
      }
      values.push({
        roundId,
        categoryId: cat.id,
        type: p.type,
        sequence: p.sequence,
        label: `${cat.shortName} — ${p.labelSuffix}`,
        startsAt,
        endsAt,
      });
    });
  }
  if (!values.length) return;

  await db.insert(raceSessions).values(values);

  await writeAudit({
    actorId: session.user.id,
    action: "round.sessions.generate",
    entityType: "round",
    entityId: roundId,
    diff: { created: values.map((v) => v.label) },
  });
  await revalidateSite(roundTags(roundId));
  revalidatePath(`/races/${roundId}`);
}
