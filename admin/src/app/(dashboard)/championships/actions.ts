"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  championships,
  championshipSeasons,
  db,
  PERMISSIONS,
  TAGS,
  type PointsSystem,
} from "@ctr/db";
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

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #RRGGBB colour");

/** Championship changes feed schedule, standings and homepage reads. */
const CHAMPIONSHIP_TAGS = [TAGS.championships, TAGS.standings, TAGS.schedule, TAGS.home];

/* ── Championship CRUD ───────────────────────────────────────────────────── */

const championshipSchema = z.object({
  name: z.string().min(1).max(255),
  shortName: z.string().min(1).max(60),
  type: z.enum(["mixed", "touring", "single_seater", "karting", "other"]),
  description: z
    .string()
    .max(10_000)
    .transform((v) => (v === "" ? null : v)),
  primaryColor: hexColor,
  secondaryColor: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^#[0-9a-fA-F]{6}$/.test(v), "Use a #RRGGBB colour"),
  logoMediaId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  sort: z.number().int().min(0).max(999),
});

function championshipFromForm(formData: FormData) {
  return championshipSchema.parse({
    name: str(formData, "name"),
    shortName: str(formData, "shortName"),
    type: str(formData, "type"),
    description: str(formData, "description"),
    primaryColor: str(formData, "primaryColor"),
    secondaryColor: str(formData, "secondaryColor"),
    logoMediaId: str(formData, "logoMediaId") || null,
    isActive: formData.get("isActive") === "on",
    sort: numOrNull(formData, "sort") ?? 0,
  });
}

export async function createChampionshipAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const data = championshipFromForm(formData);

  const [row] = await db
    .insert(championships)
    .values({ ...data, slug: slugify(data.shortName || data.name) })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "championship.create",
    entityType: "championship",
    entityId: row.id,
    diff: { after: data },
  });
  await revalidateSite(CHAMPIONSHIP_TAGS);
  revalidatePath("/championships");
  redirect(`/championships/${row.id}`);
}

export async function updateChampionshipAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const id = z.string().uuid().parse(str(formData, "id"));
  const slug = z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only")
    .parse(str(formData, "slug") || slugify(str(formData, "shortName") || str(formData, "name")));
  const data = championshipFromForm(formData);

  await db
    .update(championships)
    .set({ ...data, slug })
    .where(eq(championships.id, id));

  await writeAudit({
    actorId: session.user.id,
    action: "championship.update",
    entityType: "championship",
    entityId: id,
    diff: { after: { ...data, slug } },
  });
  await revalidateSite(CHAMPIONSHIP_TAGS);
  revalidatePath("/championships");
  revalidatePath(`/championships/${id}`);
}

export async function deleteChampionshipAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const id = z.string().uuid().parse(str(formData, "id"));

  const [gone] = await db.delete(championships).where(eq(championships.id, id)).returning();

  await writeAudit({
    actorId: session.user.id,
    action: "championship.delete",
    entityType: "championship",
    entityId: id,
    diff: { before: gone ? { name: gone.name, slug: gone.slug } : null },
  });
  await revalidateSite([...CHAMPIONSHIP_TAGS, TAGS.results, TAGS.drivers, TAGS.teams]);
  revalidatePath("/championships");
  redirect("/championships");
}

/* ── Seasons of a championship ───────────────────────────────────────────── */

const RESERVED_TYPES = ["overall", "team"] as const;

/** "25,18, 15" → [25, 18, 15]; rejects anything that isn't a non-negative int. */
function parsePointsList(input: string, label: string): number[] {
  const parts = input
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`${label} points must be comma-separated non-negative integers`);
  }
  return nums;
}

/** overall + team always present; extra sub-classification types are lowercased slugs. */
function standingsTypesFromForm(formData: FormData): string[] {
  const extras = new Set<string>();
  if (formData.get("typeRookie") === "on") extras.add("rookie");
  if (formData.get("typeGentlemen") === "on") extras.add("gentlemen");
  for (const raw of str(formData, "extraTypes").split(",")) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !RESERVED_TYPES.includes(t as (typeof RESERVED_TYPES)[number])) extras.add(t);
  }
  return [...RESERVED_TYPES, ...extras];
}

const seasonSchema = z.object({
  championshipId: z.string().uuid(),
  year: z.number().int().min(1950).max(2100),
  isCurrent: z.boolean(),
});

function seasonFromForm(formData: FormData) {
  const base = seasonSchema.parse({
    championshipId: str(formData, "championshipId"),
    year: numOrNull(formData, "year"),
    isCurrent: formData.get("isCurrent") === "on",
  });
  const race = parsePointsList(str(formData, "racePoints"), "Race");
  if (!race.length) throw new Error("Race points cannot be empty");
  const sprint = parsePointsList(str(formData, "sprintPoints"), "Sprint");
  return { ...base, race, sprint, standingsTypes: standingsTypesFromForm(formData) };
}

/** Making one season current clears the flag on the championship's other seasons. */
async function setCurrentFlag(championshipId: string, seasonId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(championshipSeasons)
      .set({ isCurrent: false })
      .where(eq(championshipSeasons.championshipId, championshipId));
    await tx
      .update(championshipSeasons)
      .set({ isCurrent: true })
      .where(eq(championshipSeasons.id, seasonId));
  });
}

export async function addChampionshipSeasonAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const data = seasonFromForm(formData);

  const pointsSystem: PointsSystem = { race: data.race, sprint: data.sprint };
  const [row] = await db
    .insert(championshipSeasons)
    .values({
      championshipId: data.championshipId,
      year: data.year,
      isCurrent: false, // set below so the clearing logic runs in one place
      pointsSystem,
      standingsTypes: data.standingsTypes,
    })
    .returning();
  if (data.isCurrent) await setCurrentFlag(data.championshipId, row.id);

  await writeAudit({
    actorId: session.user.id,
    action: "championship.season.create",
    entityType: "championship_season",
    entityId: row.id,
    diff: { after: { year: data.year, pointsSystem, standingsTypes: data.standingsTypes } },
  });
  await revalidateSite(CHAMPIONSHIP_TAGS);
  revalidatePath(`/championships/${data.championshipId}`);
}

export async function updateChampionshipSeasonAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const seasonId = z.string().uuid().parse(str(formData, "seasonId"));
  const data = seasonFromForm(formData);

  const existing = await db.query.championshipSeasons.findFirst({
    where: eq(championshipSeasons.id, seasonId),
  });
  if (!existing) return;

  const pointsSystem: PointsSystem = {
    race: data.race,
    sprint: data.sprint,
    // the flag isn't part of this form — keep whatever the season already had
    ...(existing.pointsSystem.fastestLapPoint !== undefined
      ? { fastestLapPoint: existing.pointsSystem.fastestLapPoint }
      : {}),
  };

  await db
    .update(championshipSeasons)
    .set({
      year: data.year,
      pointsSystem,
      standingsTypes: data.standingsTypes,
      ...(data.isCurrent ? {} : { isCurrent: false }),
    })
    .where(eq(championshipSeasons.id, seasonId));
  if (data.isCurrent) await setCurrentFlag(existing.championshipId, seasonId);

  await writeAudit({
    actorId: session.user.id,
    action: "championship.season.update",
    entityType: "championship_season",
    entityId: seasonId,
    diff: {
      after: {
        year: data.year,
        isCurrent: data.isCurrent,
        pointsSystem,
        standingsTypes: data.standingsTypes,
      },
    },
  });
  await revalidateSite(CHAMPIONSHIP_TAGS);
  revalidatePath(`/championships/${data.championshipId}`);
}

export async function deleteChampionshipSeasonAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const seasonId = z.string().uuid().parse(str(formData, "seasonId"));
  const championshipId = z.string().uuid().parse(str(formData, "championshipId"));

  const [gone] = await db
    .delete(championshipSeasons)
    .where(eq(championshipSeasons.id, seasonId))
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "championship.season.delete",
    entityType: "championship_season",
    entityId: seasonId,
    diff: { before: gone ? { year: gone.year } : null },
  });
  await revalidateSite([...CHAMPIONSHIP_TAGS, TAGS.results, TAGS.drivers, TAGS.teams]);
  revalidatePath(`/championships/${championshipId}`);
}
