"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { circuits, db, parseTimeToMs, PERMISSIONS, TAGS } from "@ctr/db";
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

const circuitSchema = z.object({
  name: z.string().min(1).max(200),
  officialName: optionalText(255),
  locality: optionalText(120),
  country: z.string().min(1).max(120),
  countryCode: z
    .string()
    .transform((v) => (v === "" ? null : v.toUpperCase()))
    .refine((v) => v === null || /^[A-Z]{2}$/.test(v), "Use a 2-letter ISO country code"),
  lengthKm: z.number().positive().max(50).nullable(),
  raceLaps: z.number().int().positive().max(500).nullable(),
  lapRecordTime: z
    .string()
    .max(20)
    .refine((v) => v === "" || parseTimeToMs(v) !== null, 'Lap record must look like "1:19.813"'),
  lapRecordDriver: optionalText(120),
  lapRecordYear: z.number().int().min(1950).max(2100).nullable(),
  firstGpYear: z.number().int().min(1950).max(2100).nullable(),
  description: z
    .string()
    .max(10_000)
    .transform((v) => (v === "" ? null : v)),
  mapMediaId: z.string().uuid().nullable(),
  photoMediaId: z.string().uuid().nullable(),
});

function circuitFromForm(formData: FormData) {
  const data = circuitSchema.parse({
    name: str(formData, "name"),
    officialName: str(formData, "officialName"),
    locality: str(formData, "locality"),
    country: str(formData, "country"),
    countryCode: str(formData, "countryCode"),
    lengthKm: numOrNull(formData, "lengthKm"),
    raceLaps: numOrNull(formData, "raceLaps"),
    lapRecordTime: str(formData, "lapRecordTime"),
    lapRecordDriver: str(formData, "lapRecordDriver"),
    lapRecordYear: numOrNull(formData, "lapRecordYear"),
    firstGpYear: numOrNull(formData, "firstGpYear"),
    description: str(formData, "description"),
    mapMediaId: str(formData, "mapMediaId") || null,
    photoMediaId: str(formData, "photoMediaId") || null,
  });
  const { lapRecordTime, ...rest } = data;
  return { ...rest, lapRecordTimeMs: lapRecordTime === "" ? null : parseTimeToMs(lapRecordTime) };
}

export async function createCircuitAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const data = circuitFromForm(formData);

  const [row] = await db
    .insert(circuits)
    .values({ ...data, slug: slugify(data.name) })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "circuit.create",
    entityType: "circuit",
    entityId: row.id,
    diff: { after: data },
  });
  await revalidateSite([TAGS.schedule]);
  revalidatePath("/circuits");
  redirect(`/circuits/${row.id}`);
}

export async function updateCircuitAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const id = z.string().uuid().parse(str(formData, "id"));
  const slug = z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only")
    .parse(str(formData, "slug") || slugify(str(formData, "name")));
  const data = circuitFromForm(formData);

  await db
    .update(circuits)
    .set({ ...data, slug })
    .where(eq(circuits.id, id));

  await writeAudit({
    actorId: session.user.id,
    action: "circuit.update",
    entityType: "circuit",
    entityId: id,
    diff: { after: { ...data, slug } },
  });
  await revalidateSite([TAGS.schedule]);
  revalidatePath("/circuits");
  revalidatePath(`/circuits/${id}`);
}
