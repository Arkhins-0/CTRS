"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, raceCategories, PERMISSIONS, TAGS } from "@ctr/db";
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

/** Categories feed sessions, entries, standings and homepage class strips. */
const CATEGORY_TAGS = [TAGS.categories, TAGS.home, TAGS.standings, TAGS.drivers, TAGS.schedule];

const categorySchema = z.object({
  name: z.string().min(1).max(200),
  shortName: z.string().min(1).max(60),
  description: z
    .string()
    .max(10_000)
    .transform((v) => (v === "" ? null : v)),
  carSpec: z
    .string()
    .max(10_000)
    .transform((v) => (v === "" ? null : v)),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #RRGGBB colour"),
  sort: z.number().int().min(0).max(999),
  isActive: z.boolean(),
  imageMediaId: z.string().uuid().nullable(),
});

function categoryFromForm(formData: FormData) {
  return categorySchema.parse({
    name: str(formData, "name"),
    shortName: str(formData, "shortName"),
    description: str(formData, "description"),
    carSpec: str(formData, "carSpec"),
    color: str(formData, "color"),
    sort: numOrNull(formData, "sort") ?? 0,
    isActive: formData.get("isActive") === "on",
    imageMediaId: str(formData, "imageMediaId") || null,
  });
}

export async function createCategoryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const data = categoryFromForm(formData);

  const [row] = await db
    .insert(raceCategories)
    .values({ ...data, slug: slugify(data.name) })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "category.create",
    entityType: "race_category",
    entityId: row.id,
    diff: { after: data },
  });
  await revalidateSite(CATEGORY_TAGS);
  revalidatePath("/categories");
  redirect(`/categories/${row.id}`);
}

export async function updateCategoryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const id = z.string().uuid().parse(str(formData, "id"));
  const slug = z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only")
    .parse(str(formData, "slug") || slugify(str(formData, "name")));
  const data = categoryFromForm(formData);

  await db
    .update(raceCategories)
    .set({ ...data, slug })
    .where(eq(raceCategories.id, id));

  await writeAudit({
    actorId: session.user.id,
    action: "category.update",
    entityType: "race_category",
    entityId: id,
    diff: { after: { ...data, slug } },
  });
  await revalidateSite(CATEGORY_TAGS);
  revalidatePath("/categories");
  revalidatePath(`/categories/${id}`);
}

export async function deleteCategoryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RACES_MANAGE);
  const id = z.string().uuid().parse(str(formData, "id"));

  const [gone] = await db.delete(raceCategories).where(eq(raceCategories.id, id)).returning();

  await writeAudit({
    actorId: session.user.id,
    action: "category.delete",
    entityType: "race_category",
    entityId: id,
    diff: { before: gone ? { name: gone.name, shortName: gone.shortName, slug: gone.slug } : null },
  });
  await revalidateSite([...CATEGORY_TAGS, TAGS.results, TAGS.teams]);
  revalidatePath("/categories");
  redirect("/categories");
}
