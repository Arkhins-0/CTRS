"use server";

import { asc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contentBlocks, db, pages, PERMISSIONS, TAGS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";

/* ── helpers ─────────────────────────────────────────────────────────────── */

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const str = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

const blockTypeSchema = z.enum([
  "hero",
  "rich_text",
  "image",
  "image_grid",
  "cta",
  "faq",
  "sponsor_grid",
  "raw_html",
]);

const BLOCK_DEFAULTS: Record<z.infer<typeof blockTypeSchema>, unknown> = {
  hero: { heading: "", sub: "" },
  rich_text: { html: "" },
  image: { mediaId: null, url: null, alt: "", caption: "" },
  image_grid: { items: [] },
  cta: { heading: "", buttonLabel: "", href: "" },
  faq: { items: [] },
  sponsor_grid: {},
  raw_html: { html: "" },
};

function parseImageGridLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [url, ...rest] = line.split("|");
      return { url: url.trim(), caption: rest.join("|").trim() };
    });
}

function parseFaqLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf("::");
      return {
        q: (idx === -1 ? line : line.slice(0, idx)).trim(),
        a: (idx === -1 ? "" : line.slice(idx + 2)).trim(),
      };
    });
}

/* ── page actions ────────────────────────────────────────────────────────── */

const createPageSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
});

export async function createPageAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const title = str(formData, "title");
  const data = createPageSchema.parse({
    title,
    slug: str(formData, "slug") || slugify(title),
  });

  const [row] = await db
    .insert(pages)
    .values({ title: data.title, slug: data.slug, status: "draft", updatedBy: session.user.id })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "page.create",
    entityType: "page",
    entityId: row.id,
    diff: { after: data },
  });
  await revalidateSite([TAGS.pages, TAGS.page(row.slug)]);
  revalidatePath("/pages");
  redirect(`/pages/${row.id}`);
}

const updatePageSchema = z.object({
  pageId: z.string().uuid(),
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  metaTitle: z.string().max(255),
  metaDescription: z.string(),
  ogMediaId: z.string().uuid().nullable(),
  status: z.enum(["draft", "published"]),
});

export async function updatePageMetaAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const data = updatePageSchema.parse({
    pageId: str(formData, "pageId"),
    title: str(formData, "title"),
    slug: str(formData, "slug"),
    metaTitle: str(formData, "metaTitle"),
    metaDescription: str(formData, "metaDescription"),
    ogMediaId: str(formData, "ogMediaId") || null,
    status: str(formData, "status"),
  });

  const [before] = await db.select().from(pages).where(eq(pages.id, data.pageId));
  if (!before) throw new Error("Page not found");

  await db
    .update(pages)
    .set({
      title: data.title,
      slug: data.slug,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      ogMediaId: data.ogMediaId,
      status: data.status,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(pages.id, data.pageId));

  await writeAudit({
    actorId: session.user.id,
    action: "page.update",
    entityType: "page",
    entityId: data.pageId,
    diff: {
      before: {
        title: before.title,
        slug: before.slug,
        metaTitle: before.metaTitle,
        metaDescription: before.metaDescription,
        ogMediaId: before.ogMediaId,
        status: before.status,
      },
      after: data,
    },
  });
  await revalidateSite([TAGS.pages, TAGS.page(before.slug), TAGS.page(data.slug)]);
  revalidatePath("/pages");
  revalidatePath(`/pages/${data.pageId}`);
}

export async function deletePageAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const { pageId } = z.object({ pageId: z.string().uuid() }).parse({ pageId: str(formData, "pageId") });

  const [before] = await db.select().from(pages).where(eq(pages.id, pageId));
  if (!before) throw new Error("Page not found");

  await db.delete(pages).where(eq(pages.id, pageId)); // blocks cascade

  await writeAudit({
    actorId: session.user.id,
    action: "page.delete",
    entityType: "page",
    entityId: pageId,
    diff: { before: { title: before.title, slug: before.slug, status: before.status } },
  });
  await revalidateSite([TAGS.pages, TAGS.page(before.slug)]);
  revalidatePath("/pages");
  redirect("/pages");
}

/* ── block actions ───────────────────────────────────────────────────────── */

async function getPageOrThrow(pageId: string) {
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId));
  if (!page) throw new Error("Page not found");
  return page;
}

async function touchPage(pageId: string, actorId: string) {
  await db
    .update(pages)
    .set({ updatedBy: actorId, updatedAt: new Date() })
    .where(eq(pages.id, pageId));
}

export async function addBlockAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const data = z
    .object({ pageId: z.string().uuid(), type: blockTypeSchema })
    .parse({ pageId: str(formData, "pageId"), type: str(formData, "type") });

  const page = await getPageOrThrow(data.pageId);
  const [{ m }] = await db
    .select({ m: max(contentBlocks.sort) })
    .from(contentBlocks)
    .where(eq(contentBlocks.pageId, data.pageId));

  const [row] = await db
    .insert(contentBlocks)
    .values({
      pageId: data.pageId,
      type: data.type,
      sort: (m ?? -1) + 1,
      data: BLOCK_DEFAULTS[data.type],
    })
    .returning();
  await touchPage(data.pageId, session.user.id);

  await writeAudit({
    actorId: session.user.id,
    action: "block.create",
    entityType: "content_block",
    entityId: row.id,
    diff: { after: { pageId: data.pageId, type: data.type, sort: row.sort } },
  });
  await revalidateSite([TAGS.pages, TAGS.page(page.slug)]);
  revalidatePath(`/pages/${data.pageId}`);
}

export async function updateBlockAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const { blockId } = z.object({ blockId: z.string().uuid() }).parse({ blockId: str(formData, "blockId") });

  const [block] = await db.select().from(contentBlocks).where(eq(contentBlocks.id, blockId));
  if (!block) throw new Error("Block not found");
  const page = await getPageOrThrow(block.pageId);

  let data: unknown;
  switch (block.type) {
    case "hero":
      data = z
        .object({ heading: z.string(), sub: z.string() })
        .parse({ heading: str(formData, "heading"), sub: str(formData, "sub") });
      break;
    case "rich_text":
    case "raw_html":
      data = z.object({ html: z.string() }).parse({ html: String(formData.get("html") ?? "") });
      break;
    case "image": {
      const mediaId = str(formData, "mediaId");
      const url = str(formData, "url");
      data = z
        .object({
          mediaId: z.string().uuid().nullable(),
          url: z.string().nullable(),
          alt: z.string(),
          caption: z.string(),
        })
        .parse({
          mediaId: mediaId || null,
          url: url || null,
          alt: str(formData, "alt"),
          caption: str(formData, "caption"),
        });
      break;
    }
    case "image_grid":
      data = z
        .object({ items: z.array(z.object({ url: z.string().min(1), caption: z.string() })) })
        .parse({ items: parseImageGridLines(String(formData.get("items") ?? "")) });
      break;
    case "cta":
      data = z
        .object({ heading: z.string(), buttonLabel: z.string(), href: z.string() })
        .parse({
          heading: str(formData, "heading"),
          buttonLabel: str(formData, "buttonLabel"),
          href: str(formData, "href"),
        });
      break;
    case "faq":
      data = z
        .object({ items: z.array(z.object({ q: z.string().min(1), a: z.string() })) })
        .parse({ items: parseFaqLines(String(formData.get("items") ?? "")) });
      break;
    case "sponsor_grid":
      data = {};
      break;
  }

  await db.update(contentBlocks).set({ data }).where(eq(contentBlocks.id, blockId));
  await touchPage(block.pageId, session.user.id);

  await writeAudit({
    actorId: session.user.id,
    action: "block.update",
    entityType: "content_block",
    entityId: blockId,
    diff: { before: block.data, after: data },
  });
  await revalidateSite([TAGS.pages, TAGS.page(page.slug)]);
  revalidatePath(`/pages/${block.pageId}`);
}

export async function moveBlockAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const { blockId, direction } = z
    .object({ blockId: z.string().uuid(), direction: z.enum(["up", "down"]) })
    .parse({ blockId: str(formData, "blockId"), direction: str(formData, "direction") });

  const [block] = await db.select().from(contentBlocks).where(eq(contentBlocks.id, blockId));
  if (!block) throw new Error("Block not found");
  const page = await getPageOrThrow(block.pageId);

  const siblings = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.pageId, block.pageId))
    .orderBy(asc(contentBlocks.sort), asc(contentBlocks.id));

  const idx = siblings.findIndex((b) => b.id === blockId);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= siblings.length) return; // nothing to do

  const order = [...siblings];
  [order[idx], order[swapWith]] = [order[swapWith], order[idx]];

  await db.transaction(async (tx) => {
    for (let i = 0; i < order.length; i++) {
      if (order[i].sort !== i) {
        await tx.update(contentBlocks).set({ sort: i }).where(eq(contentBlocks.id, order[i].id));
      }
    }
  });
  await touchPage(block.pageId, session.user.id);

  await writeAudit({
    actorId: session.user.id,
    action: "block.move",
    entityType: "content_block",
    entityId: blockId,
    diff: { before: { sort: idx }, after: { sort: swapWith, direction } },
  });
  await revalidateSite([TAGS.pages, TAGS.page(page.slug)]);
  revalidatePath(`/pages/${block.pageId}`);
}

export async function deleteBlockAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const { blockId } = z.object({ blockId: z.string().uuid() }).parse({ blockId: str(formData, "blockId") });

  const [block] = await db.select().from(contentBlocks).where(eq(contentBlocks.id, blockId));
  if (!block) throw new Error("Block not found");
  const page = await getPageOrThrow(block.pageId);

  await db.delete(contentBlocks).where(eq(contentBlocks.id, blockId));
  await touchPage(block.pageId, session.user.id);

  await writeAudit({
    actorId: session.user.id,
    action: "block.delete",
    entityType: "content_block",
    entityId: blockId,
    diff: { before: { type: block.type, sort: block.sort, data: block.data } },
  });
  await revalidateSite([TAGS.pages, TAGS.page(page.slug)]);
  revalidatePath(`/pages/${block.pageId}`);
}
