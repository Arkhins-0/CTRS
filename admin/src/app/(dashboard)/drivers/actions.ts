"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, drivers, driverSeasonEntries, teamSeasonEntries, PERMISSIONS, TAGS } from "@ctr/db";
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

const driverTags = (slug: string) => [TAGS.drivers, TAGS.driver(slug), TAGS.standings];

/* ── Driver ──────────────────────────────────────────────────────────────── */

const driverSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  code: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "3-letter code, e.g. VER")
    .transform((v) => v.toUpperCase()),
  countryCode: z
    .string()
    .transform((v) => (v === "" ? null : v.toUpperCase()))
    .refine((v) => v === null || /^[A-Z]{2}$/.test(v), "Use a 2-letter ISO country code"),
  dateOfBirth: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date"),
  placeOfBirth: optionalText(200),
  biography: z
    .string()
    .max(20_000)
    .transform((v) => (v === "" ? null : v)),
  isActive: z.boolean(),
});

function driverFromForm(formData: FormData) {
  return driverSchema.parse({
    firstName: str(formData, "firstName"),
    lastName: str(formData, "lastName"),
    code: str(formData, "code"),
    countryCode: str(formData, "countryCode"),
    dateOfBirth: str(formData, "dateOfBirth"),
    placeOfBirth: str(formData, "placeOfBirth"),
    biography: str(formData, "biography"),
    isActive: formData.get("isActive") === "on",
  });
}

export async function createDriverAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.DRIVERS_MANAGE);
  const data = driverFromForm(formData);

  const [row] = await db
    .insert(drivers)
    .values({ ...data, slug: slugify(`${data.firstName} ${data.lastName}`) })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "driver.create",
    entityType: "driver",
    entityId: row.id,
    diff: { after: data },
  });
  await revalidateSite(driverTags(row.slug));
  revalidatePath("/drivers");
  redirect(`/drivers/${row.id}`);
}

export async function updateDriverAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.DRIVERS_MANAGE);
  const id = z.string().uuid().parse(str(formData, "id"));
  const data = driverFromForm(formData);
  const slug = z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only")
    .parse(str(formData, "slug") || slugify(`${data.firstName} ${data.lastName}`));

  await db
    .update(drivers)
    .set({ ...data, slug })
    .where(eq(drivers.id, id));

  await writeAudit({
    actorId: session.user.id,
    action: "driver.update",
    entityType: "driver",
    entityId: id,
    diff: { after: { ...data, slug } },
  });
  await revalidateSite(driverTags(slug));
  revalidatePath("/drivers");
  revalidatePath(`/drivers/${id}`);
}

/* ── Season entries ──────────────────────────────────────────────────────── */

const entryFieldsSchema = z
  .object({
    carNumber: z.number().int().min(0).max(999),
    role: z.enum(["primary", "reserve"]),
    fromRound: z.number().int().min(1).max(30).nullable(),
    toRound: z.number().int().min(1).max(30).nullable(),
  })
  .refine((v) => v.fromRound === null || v.toRound === null || v.fromRound <= v.toRound, {
    message: "fromRound must be ≤ toRound",
  });

function entryFieldsFromForm(formData: FormData) {
  return entryFieldsSchema.parse({
    carNumber: numOrNull(formData, "carNumber"),
    role: str(formData, "role"),
    fromRound: numOrNull(formData, "fromRound"),
    toRound: numOrNull(formData, "toRound"),
  });
}

async function driverSlugById(driverId: string): Promise<string> {
  const [row] = await db
    .select({ slug: drivers.slug })
    .from(drivers)
    .where(eq(drivers.id, driverId));
  return row?.slug ?? "";
}

export async function addDriverEntryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.DRIVERS_MANAGE);
  const driverId = z.string().uuid().parse(str(formData, "driverId"));
  const teamSeasonEntryId = z.string().uuid().parse(str(formData, "teamSeasonEntryId"));
  const data = entryFieldsFromForm(formData);

  // seasonYear is denormalised from the chosen team season entry
  const teamEntry = await db.query.teamSeasonEntries.findFirst({
    where: eq(teamSeasonEntries.id, teamSeasonEntryId),
  });
  if (!teamEntry) return;

  const [row] = await db
    .insert(driverSeasonEntries)
    .values({ ...data, driverId, teamSeasonEntryId, seasonYear: teamEntry.seasonYear })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "driver.entry.create",
    entityType: "driver_season_entry",
    entityId: row.id,
    diff: { after: { ...data, teamSeasonEntryId, seasonYear: teamEntry.seasonYear } },
  });
  await revalidateSite([...driverTags(await driverSlugById(driverId)), TAGS.teams]);
  revalidatePath(`/drivers/${driverId}`);
}

export async function updateDriverEntryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.DRIVERS_MANAGE);
  const entryId = z.string().uuid().parse(str(formData, "entryId"));
  const driverId = z.string().uuid().parse(str(formData, "driverId"));
  const data = entryFieldsFromForm(formData);

  await db.update(driverSeasonEntries).set(data).where(eq(driverSeasonEntries.id, entryId));

  await writeAudit({
    actorId: session.user.id,
    action: "driver.entry.update",
    entityType: "driver_season_entry",
    entityId: entryId,
    diff: { after: data },
  });
  await revalidateSite([...driverTags(await driverSlugById(driverId)), TAGS.teams]);
  revalidatePath(`/drivers/${driverId}`);
}

export async function deleteDriverEntryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.DRIVERS_MANAGE);
  const entryId = z.string().uuid().parse(str(formData, "entryId"));
  const driverId = z.string().uuid().parse(str(formData, "driverId"));

  const [gone] = await db
    .delete(driverSeasonEntries)
    .where(eq(driverSeasonEntries.id, entryId))
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "driver.entry.delete",
    entityType: "driver_season_entry",
    entityId: entryId,
    diff: { before: gone ? { seasonYear: gone.seasonYear, carNumber: gone.carNumber } : null },
  });
  await revalidateSite([...driverTags(await driverSlugById(driverId)), TAGS.teams, TAGS.results]);
  revalidatePath(`/drivers/${driverId}`);
}
