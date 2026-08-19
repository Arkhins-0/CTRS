"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, PERMISSIONS, seasons, siteSettings, TAGS } from "@ctr/db";
import { requirePermission, type AdminSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";

/* ── shared upsert + audit + invalidate ──────────────────────────────────── */

async function saveSetting(session: AdminSession, key: string, value: unknown) {
  const [before] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));

  await db
    .insert(siteSettings)
    .values({ key, value, updatedBy: session.user.id })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedBy: session.user.id, updatedAt: new Date() },
    });

  await writeAudit({
    actorId: session.user.id,
    action: "settings.update",
    entityType: "site_setting",
    entityId: key,
    diff: { before: before?.value ?? null, after: value },
  });
  await revalidateSite([TAGS.settings, TAGS.home]);
  revalidatePath("/settings");
}

/* ── parsing helpers ─────────────────────────────────────────────────────── */

function splitPipe(line: string): [string, string] {
  const idx = line.indexOf("|");
  return idx === -1
    ? [line.trim(), ""]
    : [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
}

function lines(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

const hrefSchema = z
  .string()
  .min(1)
  .regex(/^(\/|https?:\/\/)/, "Must start with / or http(s)://");

const linkSchema = z.object({ label: z.string().min(1), href: hrefSchema });

/* ── current season ──────────────────────────────────────────────────────── */

export async function updateCurrentSeasonAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const { year } = z
    .object({ year: z.coerce.number().int().min(1950).max(2100) })
    .parse({ year: String(formData.get("year") ?? "") });

  const [target] = await db.select().from(seasons).where(eq(seasons.year, year));
  if (!target) throw new Error(`Season ${year} does not exist`);

  await db.transaction(async (tx) => {
    await tx.update(seasons).set({ isCurrent: false }).where(eq(seasons.isCurrent, true));
    await tx.update(seasons).set({ isCurrent: true }).where(eq(seasons.year, year));
  });

  await saveSetting(session, "current_season", { year });
}

/* ── broadcast banner ────────────────────────────────────────────────────── */

export async function updateBroadcastBannerAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const value = z
    .object({ enabled: z.boolean(), text: z.string(), href: z.string() })
    .parse({
      enabled: formData.get("enabled") === "on",
      text: String(formData.get("text") ?? "").trim(),
      href: String(formData.get("href") ?? "").trim(),
    });

  await saveSetting(session, "broadcast_banner", value);
}

/* ── nav links ───────────────────────────────────────────────────────────── */

export async function updateNavLinksAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const value = z.array(linkSchema).parse(
    lines(String(formData.get("links") ?? "")).map((line) => {
      const [label, href] = splitPipe(line);
      return { label, href };
    }),
  );

  await saveSetting(session, "nav_links", value);
}

/* ── social links ────────────────────────────────────────────────────────── */

export async function updateSocialLinksAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const value = z
    .array(z.object({ platform: z.string().min(1), url: z.string().url() }))
    .parse(
      lines(String(formData.get("links") ?? "")).map((line) => {
        const [platform, url] = splitPipe(line);
        return { platform, url };
      }),
    );

  await saveSetting(session, "social_links", value);
}

/* ── footer links ────────────────────────────────────────────────────────── */

export async function updateFooterLinksAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const groups: { group: string; links: { label: string; href: string }[] }[] = [];
  for (const line of lines(String(formData.get("links") ?? ""))) {
    if (line.startsWith("#")) {
      groups.push({ group: line.replace(/^#+\s*/, ""), links: [] });
    } else {
      if (!groups.length) groups.push({ group: "Links", links: [] });
      const [label, href] = splitPipe(line);
      groups[groups.length - 1].links.push({ label, href });
    }
  }

  const value = z
    .array(z.object({ group: z.string().min(1), links: z.array(linkSchema) }))
    .parse(groups);

  await saveSetting(session, "footer_links", value);
}
