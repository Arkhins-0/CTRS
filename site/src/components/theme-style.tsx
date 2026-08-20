import { getSetting } from "@/lib/settings";

type Theme = { accent: string; accentDark: string; accentFg: string };

const DEFAULT_THEME: Theme = { accent: "#F7D619", accentDark: "#E0BF06", accentFg: "#0A0A0A" };

const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

/** Injects the CMS-editable accent colour as CSS variables on :root. */
export async function ThemeStyle() {
  const t = await getSetting<Partial<Theme>>("theme", DEFAULT_THEME);
  const accent = isHex(t.accent) ? t.accent : DEFAULT_THEME.accent;
  const accentDark = isHex(t.accentDark) ? t.accentDark : DEFAULT_THEME.accentDark;
  const accentFg = isHex(t.accentFg) ? t.accentFg : DEFAULT_THEME.accentFg;
  return (
    <style>{`:root{--ctr-accent:${accent};--ctr-accent-dark:${accentDark};--ctr-accent-fg:${accentFg};}`}</style>
  );
}
