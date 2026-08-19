"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { slug as slugify } from "github-slugger";
import { count, eq } from "drizzle-orm";
import { articleCategories, articles, db, PERMISSIONS, TAGS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";

const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(120),
  sort: z
    .string()
    .transform((v) => Number.parseInt(v || "0", 10))
    .pipe(z.number().int()),
});

export async function createCategoryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWS_MANAGE); // 1

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: String(formData.get("slug") ?? ""),
    sort: String(formData.get("sort") ?? "0"),
  }); // 2
  if (!parsed.success) redirect("/news/categories?error=invalid");
  const data = parsed.data;

  const catSlug = slugify(data.slug || data.name).slice(0, 120);
  if (!catSlug) redirect("/news/categories?error=invalid");
  const [clash] = await db
    .select({ id: articleCategories.id })
    .from(articleCategories)
    .where(eq(articleCategories.slug, catSlug));
  if (clash) redirect("/news/categories?error=slug-taken");

  const [row] = await db
    .insert(articleCategories)
    .values({ name: data.name, slug: catSlug, sort: data.sort })
    .returning(); // 3

  await writeAudit({
    actorId: session.user.id,
    action: "category.create",
    entityType: "article_category",
    entityId: String(row.id),
    diff: { after: { name: data.name, slug: catSlug, sort: data.sort } },
  }); // 4

  await revalidateSite([TAGS.articles]); // 5
  revalidatePath("/news/categories"); // 6
  redirect("/news/categories");
}

export async function updateCategoryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWS_MANAGE); // 1

  const idParsed = z.coerce.number().int().positive().safeParse(formData.get("id"));
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: String(formData.get("slug") ?? ""),
    sort: String(formData.get("sort") ?? "0"),
  }); // 2
  if (!idParsed.success || !parsed.success) redirect("/news/categories?error=invalid");
  const id = idParsed.data;
  const data = parsed.data;

  const [before] = await db.select().from(articleCategories).where(eq(articleCategories.id, id));
  if (!before) redirect("/news/categories?error=not-found");

  const catSlug = slugify(data.slug || data.name).slice(0, 120) || before.slug;

  await db
    .update(articleCategories)
    .set({ name: data.name, slug: catSlug, sort: data.sort })
    .where(eq(articleCategories.id, id)); // 3

  await writeAudit({
    actorId: session.user.id,
    action: "category.update",
    entityType: "article_category",
    entityId: String(id),
    diff: {
      before: { name: before.name, slug: before.slug, sort: before.sort },
      after: { name: data.name, slug: catSlug, sort: data.sort },
    },
  }); // 4

  await revalidateSite([TAGS.articles]); // 5
  revalidatePath("/news/categories"); // 6
  redirect("/news/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWS_MANAGE); // 1

  const idParsed = z.coerce.number().int().positive().safeParse(formData.get("id")); // 2
  if (!idParsed.success) redirect("/news/categories?error=invalid");
  const id = idParsed.data;

  const [before] = await db.select().from(articleCategories).where(eq(articleCategories.id, id));
  if (!before) redirect("/news/categories?error=not-found");

  // Guard: refuse while articles still use the category.
  const [{ n }] = await db
    .select({ n: count() })
    .from(articles)
    .where(eq(articles.categoryId, id));
  if (n > 0) redirect("/news/categories?error=has-articles");

  await db.delete(articleCategories).where(eq(articleCategories.id, id)); // 3

  await writeAudit({
    actorId: session.user.id,
    action: "category.delete",
    entityType: "article_category",
    entityId: String(id),
    diff: { before: { name: before.name, slug: before.slug } },
  }); // 4

  await revalidateSite([TAGS.articles]); // 5
  revalidatePath("/news/categories"); // 6
  redirect("/news/categories");
}
