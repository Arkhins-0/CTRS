import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { adminUsers } from "./auth";

/* ── Enums ───────────────────────────────────────────────────────────────── */

export const mediaKindEnum = pgEnum("media_kind", ["image", "file", "video"]);

export const publishStatusEnum = pgEnum("publish_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const videoProviderEnum = pgEnum("video_provider", ["youtube", "file"]);

export const blockTypeEnum = pgEnum("block_type", [
  "hero",
  "rich_text",
  "image",
  "image_grid",
  "cta",
  "faq",
  "sponsor_grid",
  "raw_html",
]);

export const sponsorTierEnum = pgEnum("sponsor_tier", [
  "global_partner",
  "official_partner",
  "supplier",
]);

/* ── Media library (files live in S3; `path` is the object key) ──────────── */

/**
 * Folders are real rows rather than a value derived from media.folder, so an
 * empty folder can exist — you create one, then upload into it. `path` is the
 * full slash-separated path with no leading or trailing slash ("drivers" or
 * "drivers/2026"); the library root is the empty string and is never stored.
 */
export const mediaFolders = pgTable(
  "media_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    path: varchar("path", { length: 300 }).notNull().unique(),
    createdBy: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_folders_path_idx").on(t.path)],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: mediaKindEnum("kind").notNull().default("image"),
    path: text("path").notNull(), // S3 object key, e.g. media/drivers/uuid.webp
    /**
     * Library folder this file lives in — "" is the root. Mirrored into the
     * S3 key at upload time, but this column is the authority: objects
     * uploaded before folders existed keep their dated keys and simply sit
     * at the root.
     */
    folder: varchar("folder", { length: 300 }).notNull().default(""),
    filename: varchar("filename", { length: 255 }).notNull(),
    mime: varchar("mime", { length: 120 }).notNull(),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes"),
    alt: text("alt"),
    caption: text("caption"),
    credit: varchar("credit", { length: 255 }),
    uploadedBy: uuid("uploaded_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_created_idx").on(t.createdAt), index("media_folder_idx").on(t.folder)],
);

/* ── News ────────────────────────────────────────────────────────────────── */

export const articleCategories = pgTable("article_categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  sort: integer("sort").notNull().default(0),
});

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    standfirst: text("standfirst"),
    heroMediaId: uuid("hero_media_id").references(() => media.id, { onDelete: "set null" }),
    categoryId: integer("category_id").references(() => articleCategories.id, {
      onDelete: "set null",
    }),
    body: jsonb("body"), // TipTap JSON — source of truth
    bodyHtml: text("body_html"), // rendered cache for the public site
    status: publishStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    authorId: uuid("author_id").references(() => adminUsers.id, { onDelete: "set null" }),
    authorNameOverride: varchar("author_name_override", { length: 120 }),
    isBreaking: boolean("is_breaking").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("articles_status_published_idx").on(t.status, t.publishedAt),
    index("articles_category_idx").on(t.categoryId),
  ],
);

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
});

export const articleTags = pgTable(
  "article_tags",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.tagId] })],
);

export const articleRelated = pgTable(
  "article_related",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    relatedArticleId: uuid("related_article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.relatedArticleId] })],
);

/* ── Video & galleries ───────────────────────────────────────────────────── */

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    provider: videoProviderEnum("provider").notNull().default("youtube"),
    externalId: varchar("external_id", { length: 120 }), // YouTube video id
    mediaId: uuid("media_id").references(() => media.id, { onDelete: "set null" }), // uploaded file
    thumbnailMediaId: uuid("thumbnail_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    durationSeconds: integer("duration_seconds"),
    status: publishStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("videos_status_idx").on(t.status, t.publishedAt)],
);

export const videoTags = pgTable(
  "video_tags",
  {
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.videoId, t.tagId] })],
);

export const galleries = pgTable("galleries", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: publishStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const galleryItems = pgTable(
  "gallery_items",
  {
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    sort: integer("sort").notNull().default(0),
    captionOverride: text("caption_override"),
  },
  (t) => [primaryKey({ columns: [t.galleryId, t.mediaId] })],
);

/* ── CMS pages & blocks ──────────────────────────────────────────────────── */

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(), // "about", "privacy-policy"
  title: varchar("title", { length: 255 }).notNull(),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  ogMediaId: uuid("og_media_id").references(() => media.id, { onDelete: "set null" }),
  status: publishStatusEnum("status").notNull().default("draft"),
  updatedBy: uuid("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentBlocks = pgTable(
  "content_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    type: blockTypeEnum("type").notNull(),
    sort: integer("sort").notNull().default(0),
    data: jsonb("data").notNull().default({}),
  },
  (t) => [index("blocks_page_idx").on(t.pageId, t.sort)],
);

export const sponsors = pgTable("sponsors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  tier: sponsorTierEnum("tier").notNull().default("official_partner"),
  logoMediaId: uuid("logo_media_id").references(() => media.id, { onDelete: "set null" }),
  url: varchar("url", { length: 500 }),
  sort: integer("sort").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

/* ── Relations ───────────────────────────────────────────────────────────── */

export const mediaRelations = relations(media, ({ one }) => ({
  uploader: one(adminUsers, { fields: [media.uploadedBy], references: [adminUsers.id] }),
}));

export const articleCategoriesRelations = relations(articleCategories, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  hero: one(media, { fields: [articles.heroMediaId], references: [media.id] }),
  category: one(articleCategories, {
    fields: [articles.categoryId],
    references: [articleCategories.id],
  }),
  author: one(adminUsers, { fields: [articles.authorId], references: [adminUsers.id] }),
  articleTags: many(articleTags),
  related: many(articleRelated, { relationName: "related" }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  articleTags: many(articleTags),
  videoTags: many(videoTags),
}));

export const articleTagsRelations = relations(articleTags, ({ one }) => ({
  article: one(articles, { fields: [articleTags.articleId], references: [articles.id] }),
  tag: one(tags, { fields: [articleTags.tagId], references: [tags.id] }),
}));

export const articleRelatedRelations = relations(articleRelated, ({ one }) => ({
  article: one(articles, {
    fields: [articleRelated.articleId],
    references: [articles.id],
    relationName: "related",
  }),
  relatedArticle: one(articles, {
    fields: [articleRelated.relatedArticleId],
    references: [articles.id],
    relationName: "relatedTo",
  }),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  file: one(media, { fields: [videos.mediaId], references: [media.id] }),
  thumbnail: one(media, { fields: [videos.thumbnailMediaId], references: [media.id] }),
  videoTags: many(videoTags),
}));

export const videoTagsRelations = relations(videoTags, ({ one }) => ({
  video: one(videos, { fields: [videoTags.videoId], references: [videos.id] }),
  tag: one(tags, { fields: [videoTags.tagId], references: [tags.id] }),
}));

export const galleriesRelations = relations(galleries, ({ many }) => ({
  items: many(galleryItems),
}));

export const galleryItemsRelations = relations(galleryItems, ({ one }) => ({
  gallery: one(galleries, { fields: [galleryItems.galleryId], references: [galleries.id] }),
  media: one(media, { fields: [galleryItems.mediaId], references: [media.id] }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  blocks: many(contentBlocks),
  ogImage: one(media, { fields: [pages.ogMediaId], references: [media.id] }),
}));

export const contentBlocksRelations = relations(contentBlocks, ({ one }) => ({
  page: one(pages, { fields: [contentBlocks.pageId], references: [pages.id] }),
}));

export const sponsorsRelations = relations(sponsors, ({ one }) => ({
  logo: one(media, { fields: [sponsors.logoMediaId], references: [media.id] }),
}));
