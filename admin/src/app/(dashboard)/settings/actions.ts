"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { championships, championshipSeasons, db, PERMISSIONS, siteSettings, TAGS } from "@ctr/db";
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

/* ── current season (of the home championship, default "incrc") ──────────── */

export async function homeChampionshipSlug(): Promise<string> {
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, "home_championship"));
  const v = row?.value;
  if (typeof v === "string" && v) return v;
  if (v && typeof v === "object" && typeof (v as { slug?: unknown }).slug === "string") {
    return (v as { slug: string }).slug;
  }
  return "incrc";
}

export async function updateCurrentSeasonAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const { year } = z
    .object({ year: z.coerce.number().int().min(1950).max(2100) })
    .parse({ year: String(formData.get("year") ?? "") });

  const slug = await homeChampionshipSlug();
  const [target] = await db
    .select({ id: championshipSeasons.id, championshipId: championshipSeasons.championshipId })
    .from(championshipSeasons)
    .innerJoin(championships, eq(championshipSeasons.championshipId, championships.id))
    .where(and(eq(championships.slug, slug), eq(championshipSeasons.year, year)));
  if (!target) throw new Error(`Season ${year} does not exist for the home championship (${slug})`);

  await db.transaction(async (tx) => {
    await tx
      .update(championshipSeasons)
      .set({ isCurrent: false })
      .where(eq(championshipSeasons.championshipId, target.championshipId));
    await tx
      .update(championshipSeasons)
      .set({ isCurrent: true })
      .where(eq(championshipSeasons.id, target.id));
  });

  await saveSetting(session, "current_season", { year });
}

/* ── theme (accent colours — read by BOTH the public site and this CMS) ──── */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #RRGGBB colour");

export async function updateThemeAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const value = z
    .object({ accent: hexColor, accentDark: hexColor, accentFg: hexColor })
    .parse({
      accent: String(formData.get("accent") ?? "").trim(),
      accentDark: String(formData.get("accentDark") ?? "").trim(),
      accentFg: String(formData.get("accentFg") ?? "").trim(),
    });

  await saveSetting(session, "theme", value);
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
