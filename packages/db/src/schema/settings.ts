import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { adminUsers } from "./auth";

/**
 * Key-value site settings, e.g.
 *   current_season   → { year: 2026 }
 *   nav_links        → [{ label, href }]
 *   social_links     → [{ platform, url }]
 *   footer_links     → [{ group, links: [{ label, href }] }]
 *   broadcast_banner → { enabled, text, href }
 */
export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 120 }).primaryKey(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedBy: uuid("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
