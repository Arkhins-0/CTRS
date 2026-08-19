"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { slug as slugify } from "github-slugger";
import { and, eq, ne } from "drizzle-orm";
import {
  articleRelated,
  articleTags,
  articles,
  db,
  PERMISSIONS,
  TAGS,
  tags,
} from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";
import { sanitizeBodyHtml } from "@/components/editor/sanitize";

/** Returns `base`, or `base-2`, `base-3`… until no other article claims it. */
async function uniqueArticleSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await db
      .select({ id: articles.id })
      .from(articles)
      .where(
        excludeId
          ? and(eq(articles.slug, candidate), ne(articles.id, excludeId))
          : eq(articles.slug, candidate),
      )
      .limit(1);
    if (clash.length === 0) return candidate;
    candidate = `${base}-${n++}`;
  }
}

/* ── Create (from /news/new) ─────────────────────────────────────────────── */

export async function createArticleAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWS_MANAGE); // 1

  const title =
    z.string().max(255).parse(String(formData.get("title") ?? "")).trim() || "Untitled draft"; // 2

  const base =
    title === "Untitled draft" ? `untitled-${randomUUID().slice(0, 8)}` : slugify(title);
  const articleSlug = await uniqueArticleSlug(base.slice(0, 190) || `untitled-${randomUUID().slice(0, 8)}`);

  const [row] = await db
    .insert(articles)
    .values({ title, slug: articleSlug, status: "draft", authorId: session.user.id })
    .returning(); // 3

  await writeAudit({
    actorId: session.user.id,
    action: "article.create",
    entityType: "article",
    entityId: row.id,
    diff: { after: { title, slug: articleSlug, status: "draft" } },
  }); // 4

  await revalidateSite([TAGS.articles]); // 5 — drafts aren't public, but keep the contract cheap
  revalidatePath("/news"); // 6
  redirect(`/news/${row.id}`);
}

/* ── Save / publish / schedule / unpublish / archive ─────────────────────── */

const saveSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(255),
  slug: z.string().trim().max(200),
  standfirst: z.string().max(5000).transform((v) => v.trim() || null),
  categoryId: z
    .string()
    .transform((v) => (v === "" ? null : Number.parseInt(v, 10)))
    .pipe(z.number().int().positive().nullable()),
  heroMediaId: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().uuid().nullable()),
  authorNameOverride: z.string().max(120).transform((v) => v.trim() || null),
  isBreaking: z.boolean(),
  intent: z.enum(["save", "publish", "schedule", "unpublish", "archive"]),
  scheduledFor: z.string().max(40),
});

export async function saveArticleAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWS_MANAGE); // 1

  const rawId = String(formData.get("id") ?? "");
  const parsed = saveSchema.safeParse({
    id: rawId,
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    standfirst: String(formData.get("standfirst") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    heroMediaId: String(formData.get("heroMediaId") ?? ""),
    authorNameOverride: String(formData.get("authorNameOverride") ?? ""),
    isBreaking: formData.get("isBreaking") === "on",
    intent: String(formData.get("intent") ?? "save"),
    scheduledFor: String(formData.get("scheduledFor") ?? ""),
  }); // 2
  if (!parsed.success) {
    redirect(rawId ? `/news/${rawId}?error=invalid` : "/news?error=invalid");
  }
  const data = parsed.data;

  const [before] = await db.select().from(articles).where(eq(articles.id, data.id));
  if (!before) redirect("/news?error=not-found");

  // Slug: user value or derived from the title; unique with -2, -3… suffixes.
  const slugBase = slugify(data.slug || data.title).slice(0, 190) || `untitled-${randomUUID().slice(0, 8)}`;
  const finalSlug = await uniqueArticleSlug(slugBase, data.id);

  // Body: TipTap JSON is the source of truth; HTML is a sanitised render cache.
  let bodyJson: unknown = before.body;
  const rawBody = String(formData.get("body") ?? "");
  if (rawBody) {
    try {
      bodyJson = JSON.parse(rawBody);
    } catch {
      // keep the previous body if the hidden input was corrupted
    }
  }
  const bodyHtml = sanitizeBodyHtml(String(formData.get("body_html") ?? ""));

  // Publish-state machine.
  let status = before.status;
  let publishedAt = before.publishedAt;
  let scheduledFor = before.scheduledFor;
  if (data.intent === "publish") {
    status = "published";
    publishedAt = before.publishedAt ?? new Date();
    scheduledFor = null;
  } else if (data.intent === "schedule") {
    const when = new Date(data.scheduledFor);
    if (!data.scheduledFor || Number.isNaN(when.getTime())) {
      redirect(`/news/${data.id}?error=schedule-date`);
    }
    status = "scheduled";
    scheduledFor = when;
  } else if (data.intent === "unpublish") {
    status = "draft";
    scheduledFor = null;
  } else if (data.intent === "archive") {
    status = "archived";
  }

  // Tags: existing checkboxes + free-text "new tags" (comma separated).
  const tagIds = new Set(
    formData
      .getAll("tagIds")
      .map((v) => Number.parseInt(String(v), 10))
      .filter((n) => Number.isInteger(n) && n > 0),
  );
  const newTagNames = String(formData.get("newTags") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  // Related articles: ordered hidden inputs from the picker.
  const relatedIds = [
    ...new Set(
      formData
        .getAll("relatedIds")
        .map(String)
        .filter((v) => z.string().uuid().safeParse(v).success && v !== data.id),
    ),
  ];

  await db.transaction(async (tx) => {
    // 3a — the article itself
    await tx
      .update(articles)
      .set({
        title: data.title,
        slug: finalSlug,
        standfirst: data.standfirst,
        categoryId: data.categoryId,
        heroMediaId: data.heroMediaId,
        authorNameOverride: data.authorNameOverride,
        isBreaking: data.isBreaking,
        body: bodyJson,
        bodyHtml,
        status,
        publishedAt,
        scheduledFor,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, data.id));

    // 3b — create free-text tags (reuse rows whose slug already exists)
    for (const name of newTagNames) {
      const tagSlug = slugify(name).slice(0, 120);
      if (!tagSlug) continue;
      const [existing] = await tx.select().from(tags).where(eq(tags.slug, tagSlug));
      if (existing) {
        tagIds.add(existing.id);
      } else {
        const [created] = await tx
          .insert(tags)
          .values({ slug: tagSlug, name: name.slice(0, 120) })
          .returning();
        tagIds.add(created.id);
      }
    }

    // 3c — sync tag joins
    await tx.delete(articleTags).where(eq(articleTags.articleId, data.id));
    if (tagIds.size > 0) {
      await tx
        .insert(articleTags)
        .values([...tagIds].map((tagId) => ({ articleId: data.id, tagId })));
    }

    // 3d — sync related articles (order preserved via sort)
    await tx.delete(articleRelated).where(eq(articleRelated.articleId, data.id));
    if (relatedIds.length > 0) {
      await tx.insert(articleRelated).values(
        relatedIds.map((relatedArticleId, i) => ({
          articleId: data.id,
          relatedArticleId,
          sort: i,
        })),
      );
    }
  });

  await writeAudit({
    actorId: session.user.id,
    action: `article.${data.intent}`,
    entityType: "article",
    entityId: data.id,
    diff: {
      before: { title: before.title, slug: before.slug, status: before.status },
      after: {
        title: data.title,
        slug: finalSlug,
        status,
        categoryId: data.categoryId,
        tagIds: [...tagIds],
        relatedIds,
      },
    },
  }); // 4

  const siteTags = [TAGS.articles, TAGS.article(finalSlug), TAGS.home];
  if (before.slug !== finalSlug) siteTags.push(TAGS.article(before.slug));
  await revalidateSite(siteTags); // 5

  revalidatePath("/news"); // 6
  revalidatePath(`/news/${data.id}`);
  redirect(`/news/${data.id}?saved=1`);
}

/* ── Delete ──────────────────────────────────────────────────────────────── */

export async function deleteArticleAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWS_MANAGE); // 1

  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: formData.get("id") }); // 2
  if (!parsed.success) redirect("/news?error=invalid");
  const { id } = parsed.data;

  const [row] = await db.select().from(articles).where(eq(articles.id, id));
  if (!row) redirect("/news?error=not-found");

  await db.delete(articles).where(eq(articles.id, id)); // 3 — joins cascade

  await writeAudit({
    actorId: session.user.id,
    action: "article.delete",
    entityType: "article",
    entityId: id,
    diff: { before: { title: row.title, slug: row.slug, status: row.status } },
  }); // 4

  await revalidateSite([TAGS.articles, TAGS.article(row.slug), TAGS.home]); // 5
  revalidatePath("/news"); // 6
  redirect("/news");
}
