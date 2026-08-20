import { eq } from "drizzle-orm";
import { db, siteSettings } from "@ctr/db";

type Theme = { accent: string; accentDark: string; accentFg: string };

const DEFAULT_THEME: Theme = { accent: "#F7D619", accentDark: "#E0BF06", accentFg: "#0A0A0A" };

const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

/** Injects the CMS-editable accent colour as CSS variables on :root. */
export async function ThemeStyle() {
  let t: Partial<Theme> = DEFAULT_THEME;
  try {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, "theme"));
    if (row?.value) t = row.value as Partial<Theme>;
  } catch {
    // DB unreachable (e.g. first boot before migrate) — fall back to defaults
  }
  const accent = isHex(t.accent) ? t.accent : DEFAULT_THEME.accent;
  const accentDark = isHex(t.accentDark) ? t.accentDark : DEFAULT_THEME.accentDark;
  const accentFg = isHex(t.accentFg) ? t.accentFg : DEFAULT_THEME.accentFg;
  return (
    <style>{`:root{--ctr-accent:${accent};--ctr-accent-dark:${accentDark};--ctr-accent-fg:${accentFg};}`}</style>
  );
}
