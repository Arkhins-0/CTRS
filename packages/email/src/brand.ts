/**
 * Shared visual system for every CTR Sports email — the plain transactional
 * notices in templates.ts and the richer newsletter in newsletter.ts both
 * build on this, so a password-reset email and a race-week digest read as
 * unmistakably the same product rather than two different design systems
 * that happen to share a yellow button.
 *
 * The ground is true black, not the admin console's blue-charcoal (#15151E).
 * The two used to match exactly (and email inherited that palette from
 * admin on purpose — see the git history on this file); direct feedback on
 * a real inbox screenshot was that it read as "charcoal," not black, and
 * black was what people actually wanted here. This is a deliberate,
 * scoped divergence: only email moved, admin's own console keeps its
 * existing palette, and nothing here implies admin should follow.
 *

 * Email-specific constraints shape everything below: Outlook's desktop
 * renderer uses Word's HTML engine, which supports NEITHER <style> blocks in
 * a way that reliably cascades NOR CSS grid/flexbox/gradients/clip-path — so
 * layout stays table-based and colour stays inline. Where a webfont is
 * attempted (Gmail and Apple Mail render @font-face reasonably well), every
 * rule still carries a real system fallback for the clients that don't.
 */

/** Attribute-safe escape — brand.ts has no imports, so this stays local
 *  rather than pulling in templates.ts's escapeHtml and creating a cycle
 *  (templates.ts already imports from here). */
const attr = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export const COLOR = {
  page: "#0A0A0A", // outer background — true black, not blue-charcoal
  surface: "#141414", // the card
  panel: "#1E1E1E", // nested blocks, table headers, alternating rows
  line: "#2E2E2E", // hairline borders — depth comes from these, never shadows
  fg: "#FBFBFB",
  fgMuted: "#A9A9B4",
  fgFaint: "#7A7A88",
  accent: "#F7D619",
  accentDark: "#E0BF06",
  accentInk: "#0A0A0A", // the only colour allowed to sit on top of accent
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
 * The CTR mark, hosted at the admin console's own /ctr-logo-email.png — a
 * PNG copy of the exact artwork the console header uses (/ctr-logo.webp),
 * not the WebP itself. Several mail providers proxy and re-encode remote
 * images before displaying them (Gmail's image proxy chief among them),
 * and that pipeline has a real history of flattening WebP alpha onto a
 * solid black canvas instead of preserving transparency — the source was
 * genuinely fully transparent (alpha 0..255, verified), but showed up
 * inside a visible dark box in a real inbox. PNG transparency support is
 * universal across every mail client and every provider's proxy, so the
 * logo gets its own PNG rendition (resized to 600px — comfortable retina
 * headroom for the ~132px this ever renders at, without shipping the
 * source's full 1024px).
 *
 * packages/email stays dependency-free (no db, no required env), so this
 * reads ADMIN_URL directly with a production fallback rather than requiring
 * every call site to thread a logoUrl through — the value is effectively
 * static for this product, the same reasoning that already lets the hex
 * colours above live as literals instead of configuration.
 */
export function logoUrl(): string {
  const base = (process.env.ADMIN_URL || DEFAULT_ADMIN_ORIGIN).replace(/\/+$/, "");
  return `${base}/ctr-logo-email.png`;
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

/** Same org identity the site footer prints — kept in one place so the
 *  two never drift apart. */
export const ORG = {
  name: "CTR Unified",
  tagline: "One Nation. One Championship.",
  address: "29, Tilak Street, T. Nagar, Chennai, Tamil Nadu 600017",
  phone: "9500016999",
  email: "admin@ctrsports.in",
} as const;

export type SocialLink = { platform: string; url: string };

/**
 * Real icon PNGs, self-authored (not downloaded from any icon set — generic
 * enough shapes, a camera outline / play triangle / crossed strokes, to read
 * clearly without redrawing any platform's exact trademarked logo), hosted
 * at the admin console alongside the CTR mark and sponsor logos. Text
 * glyphs were tried first and looked deliberately wrong in a real inbox:
 * "▶" (U+25B6) has emoji presentation on several platforms' mail fonts, so
 * it showed up as a glossy orange emoji next to plain flat letters, and even
 * the safe ASCII fallback ("YT", "IG") never looked like an actual icon —
 * just initials in a circle. PNG, same reasoning as the CTR mark and
 * sponsor logos: universal transparency support, no proxy-mangling risk.
 * SOCIAL_ICON_PLATFORMS lists what's actually generated (see
 * scripts/mock-art or the repo's icon-generation script); anything else
 * falls back to a plain ASCII initials badge rather than a broken image.
 */
const SOCIAL_ICON_PLATFORMS = new Set([
  "instagram",
  "facebook",
  "x",
  "twitter",
  "youtube",
  "tiktok",
  "discord",
  "twitch",
  "linkedin",
]);

/** File on disk has no separate "twitter" — it's the same X mark. */
const ICON_FILE: Record<string, string> = { twitter: "x" };

function socialIconUrl(platform: string): string {
  const key = platform.trim().toLowerCase();
  const base = (process.env.ADMIN_URL || DEFAULT_ADMIN_ORIGIN).replace(/\/+$/, "");
  return `${base}/social/${ICON_FILE[key] ?? key}.png`;
}

const SOCIAL_GLYPH: Record<string, string> = {
  instagram: "IG",
  twitter: "X",
  x: "X",
  facebook: "f",
  youtube: "YT",
  tiktok: "TT",
  discord: "DC",
  twitch: "TW",
  linkedin: "in",
};

function socialGlyph(platform: string): string {
  return SOCIAL_GLYPH[platform.trim().toLowerCase()] ?? platform.trim().slice(0, 2).toUpperCase();
}

/**
 * A row of small circular badges linking out to the org's social accounts,
 * read from the same site_settings.social_links the admin console's Settings
 * page manages — so the footer never drifts from what's actually live.
 * Renders nothing when no links are configured.
 */
export function socialBadges(links: SocialLink[]): string {
  const usable = links.filter((l) => l.platform && l.url);
  if (!usable.length) return "";
  const cells = usable
    .map((l) => {
      const key = l.platform.trim().toLowerCase();
      const inner = SOCIAL_ICON_PLATFORMS.has(key)
        ? `<img src="${socialIconUrl(key)}" width="18" height="18" alt="${attr(l.platform)}" style="display:block;width:18px;height:18px;" />`
        : socialGlyph(l.platform);
      // Circular, accent-ringed — the convention most senders' footers
      // already train subscribers to recognise as "social links here".
      return `<td style="padding:0 6px;">
           <a href="${l.url}" style="display:block;width:32px;height:32px;line-height:32px;text-align:center;background:${COLOR.panel};border:1px solid ${COLOR.accent};border-radius:50%;font-family:${FONT.display};font-weight:600;font-size:12px;color:${COLOR.accent};text-decoration:none;">
             <table role="presentation" width="100%" height="100%" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle">${inner}</td></tr></table>
           </a>
         </td>`;
    })
    .join("");
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:14px auto 0;"><tr>${cells}</tr></table>`;
}

/**
 * "We're here to help" block — the piece the newsletter footer was missing
 * next to the unsubscribe line: a real, human way to reach CTR that isn't
 * "hit reply". No invented "Help Center" link — the site doesn't have an
 * FAQ page yet, and a dead link would read worse than no link.
 */
export function helpBlock(): string {
  return `
<tr><td style="padding:24px 32px 0;text-align:center;" bgcolor="${COLOR.page}">
  <p style="margin:0 0 6px;font-family:${FONT.display};font-weight:600;font-size:13px;letter-spacing:0.3px;text-transform:uppercase;color:${COLOR.fg};">We're here to help</p>
  <p style="margin:0;font-family:${FONT.body};font-size:12.5px;line-height:1.6;color:${COLOR.fgMuted};">
    Questions about your subscription, tickets or the championship?
    <a href="mailto:${ORG.email}" style="color:${COLOR.accent};text-decoration:underline;">Email ${ORG.email}</a>
  </p>
</td></tr>`;
}

/** Org identity + postal address — required on any marketing/bulk email
 *  under CAN-SPAM/anti-spam law, and the same block the site footer prints. */
export function orgAddressBlock(): string {
  return `
<tr><td style="padding:20px 32px 0;text-align:center;" bgcolor="${COLOR.page}">
  <p style="margin:0 0 3px;font-family:${FONT.display};font-weight:600;font-size:12px;text-transform:uppercase;color:${COLOR.fgMuted};">${ORG.name} — ${ORG.tagline}</p>
  <p style="margin:0;font-family:${FONT.body};font-size:11.5px;line-height:1.6;color:${COLOR.fgFaint};">${ORG.address} · ${ORG.phone}</p>
</td></tr>`;
}
