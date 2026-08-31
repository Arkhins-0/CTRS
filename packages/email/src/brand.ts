/**
 * Shared visual system for every CTR Sports email — the plain transactional
 * notices in templates.ts and the richer newsletter in newsletter.ts both
 * build on this, so a password-reset email and a race-week digest read as
 * unmistakably the same product rather than two different design systems
 * that happen to share a yellow button.
 *
 * Every token here is the SAME hex value as the admin console's dark palette
 * (admin/src/app/globals.css) — deliberately, so the whole product (console
 * + email) reads as one system rather than email getting its own palette.
 *
 * Email-specific constraints shape everything below: Outlook's desktop
 * renderer uses Word's HTML engine, which supports NEITHER <style> blocks in
 * a way that reliably cascades NOR CSS grid/flexbox/gradients/clip-path — so
 * layout stays table-based and colour stays inline. Where a webfont is
 * attempted (Gmail and Apple Mail render @font-face reasonably well), every
 * rule still carries a real system fallback for the clients that don't.
 */

export const COLOR = {
  page: "#15151E", // outer background — matches the admin console's page token
  surface: "#1F1F2B", // the card
  panel: "#2A2A38", // nested blocks, table headers, alternating rows
  line: "#38384A", // hairline borders — depth comes from these, never shadows
  fg: "#FBFBFB",
  fgMuted: "#A9A9B4",
  fgFaint: "#7A7A88",
  accent: "#F7D619",
  accentDark: "#E0BF06",
  accentInk: "#15151E", // the only colour allowed to sit on top of accent
  danger: "#F0605F",
  positive: "#34D399",
} as const;

/**
 * Oswald: condensed, bold, built for exactly the short uppercase labels an
 * email masthead and section headings need. Genuinely brand-historical, not
 * an arbitrary pick — it was CTR's site display face before Plus Jakarta Sans
 * replaced it, for a reason specific to the site (large sentence-case
 * headlines a condensed face can't carry). That reason doesn't apply here:
 * email headings are short and look better tightened, so Oswald comes home
 * for the one surface where its original weakness is not in play.
 *
 * Inter: already the site's body face. Reusing it in email is the same
 * "one system" move as the colour tokens.
 */
export const FONT = {
  display: "'Oswald', 'Arial Narrow', Arial, Helvetica, sans-serif",
  body: "'Inter', Arial, Helvetica, sans-serif",
  mono: "'JetBrains Mono', 'Courier New', Courier, monospace",
} as const;

/**
 * Embeds Oswald + Inter via Google Fonts' @font-face endpoint directly in a
 * <style> block. Gmail (web and app) and Apple Mail both render this; Outlook
 * desktop ignores the whole block and silently uses the fallback stack in
 * FONT above — by design, not a failure state.
 */
export const FONT_FACES = `
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
  `;

const DEFAULT_ADMIN_ORIGIN = "https://admin.ctr.arkhins.com";

/**
 * The CTR mark, hosted at the admin console's own /ctr-logo.webp — the exact
 * asset the console header already uses, so the logo in an inbox and the
 * logo in the product are the same file. A 16:9 lockup with a transparent
 * ground, designed for a near-black surface, which is exactly what this
 * palette provides everywhere it appears.
 *
 * packages/email stays dependency-free (no db, no required env), so this
 * reads ADMIN_URL directly with a production fallback rather than requiring
 * every call site to thread a logoUrl through — the value is effectively
 * static for this product, the same reasoning that already lets the hex
 * colours above live as literals instead of configuration.
 */
export function logoUrl(): string {
  const base = (process.env.ADMIN_URL || DEFAULT_ADMIN_ORIGIN).replace(/\/+$/, "");
  return `${base}/ctr-logo.webp`;
}

const px = (n: number) => `${n}px`;

/**
 * A slim strip of alternating cells — the only cross-client-safe way to get
 * a hazard-tape stripe into an email: no gradients, no background-image,
 * just table cells with solid bgcolor.
 */
export function hazardStripe(width: number, height = 6, cells = 28): string {
  const cellWidth = width / cells;
  const tds = Array.from(
    { length: cells },
    (_, i) =>
      `<td width="${Math.round(cellWidth)}" height="${height}" style="background:${i % 2 === 0 ? COLOR.page : COLOR.accent};font-size:0;line-height:0;" bgcolor="${i % 2 === 0 ? COLOR.page : COLOR.accent}">&nbsp;</td>`,
  ).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tds}</tr></table>`;
}

export function eyebrow(label: string, tone: "accent" | "muted" = "accent"): string {
  const color = tone === "accent" ? COLOR.accent : COLOR.fgFaint;
  return `<span style="display:inline-block;font-family:${FONT.display};font-weight:600;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${color};">${label}</span>`;
}

export function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${COLOR.accent};color:${COLOR.accentInk};font-family:${FONT.display};font-weight:600;font-size:14px;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:2px;">${label}</a>`;
}

/** Wordmark + logo image, used at the top of every email. */
export function brandMark(width = 132): string {
  const h = Math.round((width * 9) / 16);
  return `<img src="${logoUrl()}" width="${width}" height="${h}" alt="CTR Sports" style="display:block;width:${px(width)};height:${px(h)};" />`;
}

export type SocialLink = { platform: string; url: string };

/**
 * Short glyph/initials per platform for the footer badges below — chosen
 * over hosted icon images on purpose. An email footer icon row is the one
 * place a broken/blocked image is most likely (image-blocking is the email
 * client default), and a whole row of empty boxes reads worse than no row at
 * all. A table cell with a real glyph always renders, in every client, with
 * no network fetch — the same reasoning that makes hazardStripe() a table
 * instead of a background-image.
 */
const SOCIAL_GLYPH: Record<string, string> = {
  instagram: "IG",
  twitter: "𝕏",
  x: "𝕏",
  facebook: "f",
  youtube: "▶",
  tiktok: "TT",
  discord: "DC",
  twitch: "TW",
  linkedin: "in",
};

function socialGlyph(platform: string): string {
  return SOCIAL_GLYPH[platform.trim().toLowerCase()] ?? platform.trim().slice(0, 2).toUpperCase();
}

/**
 * A row of small square badges linking out to the org's social accounts,
 * read from the same site_settings.social_links the admin console's Settings
 * page manages — so the footer never drifts from what's actually live.
 * Renders nothing when no links are configured.
 */
export function socialBadges(links: SocialLink[]): string {
  const usable = links.filter((l) => l.platform && l.url);
  if (!usable.length) return "";
  const cells = usable
    .map(
      (l) =>
        `<td style="padding:0 6px;">
           <a href="${l.url}" style="display:block;width:30px;height:30px;line-height:30px;text-align:center;background:${COLOR.panel};border:1px solid ${COLOR.line};border-radius:2px;font-family:${FONT.display};font-weight:600;font-size:12px;color:${COLOR.fg};text-decoration:none;">${socialGlyph(l.platform)}</a>
         </td>`,
    )
    .join("");
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:14px auto 0;"><tr>${cells}</tr></table>`;
}
