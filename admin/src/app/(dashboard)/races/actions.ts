"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, grandsPrix, raceSessions, PERMISSIONS, TAGS } from "@ctr/db";
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

const gpStatusSchema = z.enum(["scheduled", "live", "completed", "cancelled"]);
const sessionStatusSchema = z.enum(["scheduled", "live", "completed", "cancelled"]);
const sessionTypeSchema = z.enum([
  "fp1",
  "fp2",
  "fp3",
  "sprint_qualifying",
  "sprint",
  "qualifying",
  "race",
]);

const gpSchema = z.object({
  seasonYear: z.number().int().min(1950).max(2100),
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
  status: gpStatusSchema,
});

function gpFromForm(formData: FormData) {
  return gpSchema.parse({
    seasonYear: numOrNull(formData, "seasonYear"),
    round: numOrNull(formData, "round"),
    name: str(formData, "name"),
    officialName: str(formData, "officialName"),
    circuitId: str(formData, "circuitId"),
    startDate: str(formData, "startDate"),
    endDate: str(formData, "endDate"),
    hasSprint: formData.get("hasSprint") === "on",
    status: str(formData, "status"),
  });
}

const gpTags = (id: string) => [TAGS.schedule, TAGS.gp(id), TAGS.home];

/* ── Grand Prix CRUD ─────────────────────────────────────────────────────── */

export async function createGpAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const data = gpFromForm(formData);

  const [row] = await db
    .insert(grandsPrix)
    .values({ ...data, slug: slugify(data.name) })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "gp.create",
    entityType: "grand_prix",
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
  const data = gpFromForm(formData);

  await db
    .update(grandsPrix)
    .set({ ...data, slug: slugify(data.name) })
    .where(eq(grandsPrix.id, id));

  await writeAudit({
    actorId: session.user.id,
    action: "gp.update",
    entityType: "grand_prix",
    entityId: id,
    diff: { after: data },
  });
  await revalidateSite(gpTags(id));
  revalidatePath("/races");
  revalidatePath(`/races/${id}`);
}

export async function deleteGpAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const id = z.string().uuid().parse(str(formData, "id"));

  const [gone] = await db.delete(grandsPrix).where(eq(grandsPrix.id, id)).returning();

  await writeAudit({
    actorId: session.user.id,
    action: "gp.delete",
    entityType: "grand_prix",
    entityId: id,
    diff: { before: gone ? { name: gone.name, seasonYear: gone.seasonYear, round: gone.round } : null },
  });
  await revalidateSite([...gpTags(id), TAGS.results, TAGS.standings]);
  revalidatePath("/races");
  redirect(`/races?year=${gone?.seasonYear ?? ""}`);
}

/* ── Session management ──────────────────────────────────────────────────── */

const sessionFormSchema = z.object({
  gpId: z.string().uuid(),
  startsAt: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || !Number.isNaN(new Date(v).getTime()), "Invalid date/time"),
});

export async function addSessionAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const { gpId, startsAt } = sessionFormSchema.parse({
    gpId: str(formData, "gpId"),
    startsAt: str(formData, "startsAt"),
  });
  const type = sessionTypeSchema.parse(str(formData, "type"));

  const [row] = await db
    .insert(raceSessions)
    .values({ grandPrixId: gpId, type, startsAt: startsAt ? new Date(startsAt) : null })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "gp.session.create",
    entityType: "race_session",
    entityId: row.id,
    diff: { after: { type, startsAt } },
  });
  await revalidateSite(gpTags(gpId));
  revalidatePath(`/races/${gpId}`);
}

export async function updateSessionAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const sessionId = z.string().uuid().parse(str(formData, "sessionId"));
  const { gpId, startsAt } = sessionFormSchema.parse({
    gpId: str(formData, "gpId"),
    startsAt: str(formData, "startsAt"),
  });
  const status = sessionStatusSchema.parse(str(formData, "status"));

  await db
    .update(raceSessions)
    .set({ startsAt: startsAt ? new Date(startsAt) : null, status })
    .where(eq(raceSessions.id, sessionId));

  await writeAudit({
    actorId: session.user.id,
    action: "gp.session.update",
    entityType: "race_session",
    entityId: sessionId,
    diff: { after: { startsAt, status } },
  });
  await revalidateSite(gpTags(gpId));
  revalidatePath(`/races/${gpId}`);
}

export async function deleteSessionAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const sessionId = z.string().uuid().parse(str(formData, "sessionId"));
  const gpId = z.string().uuid().parse(str(formData, "gpId"));

  const [gone] = await db.delete(raceSessions).where(eq(raceSessions.id, sessionId)).returning();

  await writeAudit({
    actorId: session.user.id,
    action: "gp.session.delete",
    entityType: "race_session",
    entityId: sessionId,
    diff: { before: gone ? { type: gone.type } : null },
  });
  await revalidateSite([...gpTags(gpId), TAGS.results, TAGS.resultsSession(sessionId)]);
  revalidatePath(`/races/${gpId}`);
}

/** Standard weekend timetable, offset in days/time from the GP start date. */
const WEEKEND_PLAN: Record<
  "standard" | "sprint",
  { type: z.infer<typeof sessionTypeSchema>; day: number; time: string; minutes: number }[]
> = {
  standard: [
    { type: "fp1", day: 0, time: "11:30", minutes: 60 },
    { type: "fp2", day: 0, time: "15:00", minutes: 60 },
    { type: "fp3", day: 1, time: "10:30", minutes: 60 },
    { type: "qualifying", day: 1, time: "14:00", minutes: 60 },
    { type: "race", day: 2, time: "13:00", minutes: 120 },
  ],
  sprint: [
    { type: "fp1", day: 0, time: "10:30", minutes: 60 },
    { type: "sprint_qualifying", day: 0, time: "14:30", minutes: 45 },
    { type: "sprint", day: 1, time: "10:00", minutes: 45 },
    { type: "qualifying", day: 1, time: "14:00", minutes: 60 },
    { type: "race", day: 2, time: "13:00", minutes: 120 },
  ],
};

export async function generateWeekendAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const gpId = z.string().uuid().parse(str(formData, "gpId"));

  const gp = await db.query.grandsPrix.findFirst({
    where: eq(grandsPrix.id, gpId),
    with: { sessions: { columns: { type: true } } },
  });
  if (!gp) return;

  const existing = new Set(gp.sessions.map((s) => s.type));
  const plan = WEEKEND_PLAN[gp.hasSprint ? "sprint" : "standard"];
  const missing = plan.filter((p) => !existing.has(p.type));
  if (!missing.length) return;

  const base = gp.startDate ? new Date(`${gp.startDate}T00:00:00`) : null;
  const values = missing.map((p) => {
    let startsAt: Date | null = null;
    let endsAt: Date | null = null;
    if (base) {
      const [h, m] = p.time.split(":").map(Number);
      startsAt = new Date(base.getTime() + p.day * 86_400_000 + h * 3_600_000 + m * 60_000);
      endsAt = new Date(startsAt.getTime() + p.minutes * 60_000);
    }
    return { grandPrixId: gpId, type: p.type, startsAt, endsAt };
  });

  await db.insert(raceSessions).values(values);

  await writeAudit({
    actorId: session.user.id,
    action: "gp.sessions.generate",
    entityType: "grand_prix",
    entityId: gpId,
    diff: { created: missing.map((p) => p.type) },
  });
  await revalidateSite(gpTags(gpId));
  revalidatePath(`/races/${gpId}`);
}
