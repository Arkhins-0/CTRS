"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cars, db, teams, teamSeasonEntries, PERMISSIONS, TAGS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";

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

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #RRGGBB colour");

const teamTags = (slug: string) => [TAGS.teams, TAGS.team(slug), TAGS.standings, TAGS.home];

async function teamSlugForEntry(entryId: string): Promise<{ teamId: string; slug: string } | null> {
  const [row] = await db
    .select({ teamId: teams.id, slug: teams.slug })
    .from(teamSeasonEntries)
    .innerJoin(teams, eq(teamSeasonEntries.teamId, teams.id))
    .where(eq(teamSeasonEntries.id, entryId));
  return row ?? null;
}

/* ── Canonical team ──────────────────────────────────────────────────────── */

const teamSchema = z.object({
  name: z.string().min(1).max(120),
  fullName: optionalText(200),
  base: optionalText(200),
  countryCode: z
    .string()
    .transform((v) => (v === "" ? null : v.toUpperCase()))
    .refine((v) => v === null || /^[A-Z]{2}$/.test(v), "Use a 2-letter ISO country code"),
  firstEntryYear: z.number().int().min(1900).max(2100).nullable(),
  worldChampionships: z.number().int().min(0).max(50),
  description: z
    .string()
    .max(10_000)
    .transform((v) => (v === "" ? null : v)),
});

function teamFromForm(formData: FormData) {
  return teamSchema.parse({
    name: str(formData, "name"),
    fullName: str(formData, "fullName"),
    base: str(formData, "base"),
    countryCode: str(formData, "countryCode"),
    firstEntryYear: numOrNull(formData, "firstEntryYear"),
    worldChampionships: numOrNull(formData, "worldChampionships") ?? 0,
    description: str(formData, "description"),
  });
}

export async function createTeamAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.TEAMS_MANAGE);
  const data = teamFromForm(formData);

  const [row] = await db
    .insert(teams)
    .values({ ...data, slug: slugify(data.name) })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "team.create",
    entityType: "team",
    entityId: row.id,
    diff: { after: data },
  });
  await revalidateSite(teamTags(row.slug));
  revalidatePath("/teams");
  redirect(`/teams/${row.id}`);
}

export async function updateTeamAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.TEAMS_MANAGE);
  const id = z.string().uuid().parse(str(formData, "id"));
  const slug = z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only")
    .parse(str(formData, "slug") || slugify(str(formData, "name")));
  const data = teamFromForm(formData);

  await db
    .update(teams)
    .set({ ...data, slug })
    .where(eq(teams.id, id));

  await writeAudit({
    actorId: session.user.id,
    action: "team.update",
    entityType: "team",
    entityId: id,
    diff: { after: { ...data, slug } },
  });
  await revalidateSite(teamTags(slug));
  revalidatePath("/teams");
  revalidatePath(`/teams/${id}`);
}

export async function deleteTeamAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.TEAMS_MANAGE);
  const id = z.string().uuid().parse(str(formData, "id"));

  const [gone] = await db.delete(teams).where(eq(teams.id, id)).returning();

  await writeAudit({
    actorId: session.user.id,
    action: "team.delete",
    entityType: "team",
    entityId: id,
    diff: { before: gone ? { name: gone.name, slug: gone.slug } : null },
  });
  await revalidateSite([...teamTags(gone?.slug ?? ""), TAGS.drivers, TAGS.results]);
  revalidatePath("/teams");
  redirect("/teams");
}

/* ── Season entries ──────────────────────────────────────────────────────── */

const entrySchema = z.object({
  displayName: z.string().min(1).max(200),
  shortName: z.string().min(1).max(60),
  primaryColor: hexColor,
  secondaryColor: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^#[0-9a-fA-F]{6}$/.test(v), "Use a #RRGGBB colour"),
  teamPrincipal: optionalText(120),
  powerUnitSupplier: optionalText(120),
});

function entryFromForm(formData: FormData) {
  return entrySchema.parse({
    displayName: str(formData, "displayName"),
    shortName: str(formData, "shortName"),
    primaryColor: str(formData, "primaryColor"),
    secondaryColor: str(formData, "secondaryColor"),
    teamPrincipal: str(formData, "teamPrincipal"),
    powerUnitSupplier: str(formData, "powerUnitSupplier"),
  });
}

export async function createTeamEntryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.TEAMS_MANAGE);
  const teamId = z.string().uuid().parse(str(formData, "teamId"));
  const seasonYear = z.coerce.number().int().min(1950).max(2100).parse(str(formData, "seasonYear"));
  const data = entryFromForm(formData);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) return;

  const [row] = await db
    .insert(teamSeasonEntries)
    .values({ ...data, teamId, seasonYear })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "team.entry.create",
    entityType: "team_season_entry",
    entityId: row.id,
    diff: { after: { ...data, seasonYear } },
  });
  await revalidateSite(teamTags(team.slug));
  revalidatePath(`/teams/${teamId}`);
}

export async function updateTeamEntryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.TEAMS_MANAGE);
  const entryId = z.string().uuid().parse(str(formData, "entryId"));
  const data = entryFromForm(formData);

  const owner = await teamSlugForEntry(entryId);
  if (!owner) return;

  await db.update(teamSeasonEntries).set(data).where(eq(teamSeasonEntries.id, entryId));

  await writeAudit({
    actorId: session.user.id,
    action: "team.entry.update",
    entityType: "team_season_entry",
    entityId: entryId,
    diff: { after: data },
  });
  await revalidateSite(teamTags(owner.slug));
  revalidatePath(`/teams/${owner.teamId}`);
}

/* ── Car (one per season entry) ──────────────────────────────────────────── */

const carSchema = z.object({
  modelName: z.string().min(1).max(60),
  chassis: optionalText(120),
  powerUnit: optionalText(120),
  weight: optionalText(60),
  engine: optionalText(120),
  ers: optionalText(120),
  gearbox: optionalText(120),
  fuel: optionalText(120),
  note: optionalText(500),
});

export async function saveCarAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.TEAMS_MANAGE);
  const entryId = z.string().uuid().parse(str(formData, "entryId"));
  const data = carSchema.parse({
    modelName: str(formData, "modelName"),
    chassis: str(formData, "chassis"),
    powerUnit: str(formData, "powerUnit"),
    weight: str(formData, "weight"),
    engine: str(formData, "engine"),
    ers: str(formData, "ers"),
    gearbox: str(formData, "gearbox"),
    fuel: str(formData, "fuel"),
    note: str(formData, "note"),
  });

  const owner = await teamSlugForEntry(entryId);
  if (!owner) return;

  const specEntries = (["weight", "engine", "ers", "gearbox", "fuel", "note"] as const)
    .map((k) => [k, data[k]] as const)
    .filter(([, v]) => v !== null);
  const specs = specEntries.length ? Object.fromEntries(specEntries) : null;

  const values = {
    teamSeasonEntryId: entryId,
    modelName: data.modelName,
    chassis: data.chassis,
    powerUnit: data.powerUnit,
    specs,
  };

  await db
    .insert(cars)
    .values(values)
    .onConflictDoUpdate({
      target: cars.teamSeasonEntryId,
      set: { modelName: values.modelName, chassis: values.chassis, powerUnit: values.powerUnit, specs },
    });

  await writeAudit({
    actorId: session.user.id,
    action: "team.car.save",
    entityType: "car",
    entityId: entryId,
    diff: { after: values },
  });
  await revalidateSite(teamTags(owner.slug));
  revalidatePath(`/teams/${owner.teamId}`);
}
