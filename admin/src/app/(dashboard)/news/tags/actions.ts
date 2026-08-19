"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { slug as slugify } from "github-slugger";
import { eq } from "drizzle-orm";
import { db, PERMISSIONS, TAGS, tags } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";

const tagSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(120),
});

export async function createTagAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWS_MANAGE); // 1

  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
    slug: String(formData.get("slug") ?? ""),
  }); // 2
  if (!parsed.success) redirect("/news/tags?error=invalid");
  const data = parsed.data;

  const tagSlug = slugify(data.slug || data.name).slice(0, 120);
  if (!tagSlug) redirect("/news/tags?error=invalid");
  const [clash] = await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, tagSlug));
  if (clash) redirect("/news/tags?error=slug-taken");

  const [row] = await db.insert(tags).values({ name: data.name, slug: tagSlug }).returning(); // 3

  await writeAudit({
    actorId: session.user.id,
    action: "tag.create",
    entityType: "tag",
    entityId: String(row.id),
    diff: { after: { name: data.name, slug: tagSlug } },
  }); // 4

  await revalidateSite([TAGS.articles, TAGS.videos]); // 5 — tags appear on both
  revalidatePath("/news/tags"); // 6
  redirect("/news/tags");
}

export async function updateTagAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWS_MANAGE); // 1

  const idParsed = z.coerce.number().int().positive().safeParse(formData.get("id"));
  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
    slug: String(formData.get("slug") ?? ""),
  }); // 2
  if (!idParsed.success || !parsed.success) redirect("/news/tags?error=invalid");
  const id = idParsed.data;
  const data = parsed.data;

  const [before] = await db.select().from(tags).where(eq(tags.id, id));
  if (!before) redirect("/news/tags?error=not-found");

  const tagSlug = slugify(data.slug || data.name).slice(0, 120) || before.slug;

  await db.update(tags).set({ name: data.name, slug: tagSlug }).where(eq(tags.id, id)); // 3

  await writeAudit({
    actorId: session.user.id,
    action: "tag.update",
    entityType: "tag",
    entityId: String(id),
    diff: {
      before: { name: before.name, slug: before.slug },
      after: { name: data.name, slug: tagSlug },
    },
  }); // 4

  await revalidateSite([TAGS.articles, TAGS.videos]); // 5
  revalidatePath("/news/tags"); // 6
  redirect("/news/tags");
}

export async function deleteTagAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWS_MANAGE); // 1

  const idParsed = z.coerce.number().int().positive().safeParse(formData.get("id")); // 2
  if (!idParsed.success) redirect("/news/tags?error=invalid");
  const id = idParsed.data;

  const [before] = await db.select().from(tags).where(eq(tags.id, id));
  if (!before) redirect("/news/tags?error=not-found");

  await db.delete(tags).where(eq(tags.id, id)); // 3 — join rows cascade

  await writeAudit({
    actorId: session.user.id,
    action: "tag.delete",
    entityType: "tag",
    entityId: String(id),
    diff: { before: { name: before.name, slug: before.slug } },
  }); // 4

  await revalidateSite([TAGS.articles, TAGS.videos]); // 5
  revalidatePath("/news/tags"); // 6
  redirect("/news/tags");
}
