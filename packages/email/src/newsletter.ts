import type { EmailMessage } from "./client";
import { escapeHtml } from "./templates";

/**
 * "The Pit Wall" — CTR's editorial newsletter shell.
 *
 * Deliberately NOT a reskin of the plain transactional layout() in
 * templates.ts: those are notices (reset a password, confirm an address) and
 * read as one paragraph and a button. This is the thing people actually
 * signed up to receive, so it earns real front-page treatment — a masthead,
 * a leaderboard-styled standings table, hazard-tape dividers borrowed from
 * the pit lane, condensed caps for headlines. Still pure inline-styled
 * tables throughout (no <style> block, no CSS grid, no gradients) because
 * Outlook's Word rendering engine does not reliably support any of those.
 *
 * This module has zero database dependency, matching templates.ts: every
 * function takes already-assembled primitives. The cron (digest) and the
 * admin composer (broadcast) do the querying and hand this module strings.
 */

const INK = "#0A0A0A";
const PAPER = "#FFFFFF";
const PANEL = "#F4F4F4";
const LINE = "#E1E1E1";
const ACCENT = "#F7D619";
const ACCENT_DARK = "#B39400";
const TEXT = "#15151E";
const MUTED = "#5B5B66";
const FAINT = "#8A8A94";

const WIDTH = 640;

/** Condensed-caps headline stack — Impact/Arial Narrow read as timing-tower signage; falls back everywhere. */
const DISPLAY_FONT = "'Arial Narrow', Arial, Helvetica, sans-serif";
const BODY_FONT = "Arial, Helvetica, sans-serif";
const MONO_FONT = "'Courier New', Courier, monospace";

const px = (n: number) => `${n}px`;

/** A slim strip of alternating cells — the only cross-client-safe way to get
 *  a hazard-tape stripe into an email: no gradients, no background-image,
 *  just table cells with solid bgcolor. Used sparingly, as a section beat. */
function hazardStripe(height = 8, cells = 24): string {
  const cellWidth = WIDTH / cells;
  const tds = Array.from(
    { length: cells },
    (_, i) =>
      `<td width="${cellWidth}" height="${height}" style="background:${i % 2 === 0 ? INK : ACCENT};font-size:0;line-height:0;">&nbsp;</td>`,
  ).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tds}</tr></table>`;
}

function eyebrowChip(label: string): string {
  return `<span style="display:inline-block;background:${INK};color:${ACCENT};font-family:${DISPLAY_FONT};font-weight:700;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;padding:5px 10px;">${escapeHtml(label)}</span>`;
}

function sectionHeading(label: string): string {
  return `
<tr><td style="padding:34px 32px 14px;">
  ${eyebrowChip(label)}
</td></tr>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${ACCENT};color:${INK};font-family:${DISPLAY_FONT};font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:13px 26px;">${escapeHtml(label)}</a>`;
}

export type NewsCard = {
  title: string;
  url: string;
  imageUrl: string | null;
  category: string | null;
  standfirst: string;
};

function newsCardRow(item: NewsCard): string {
  const image = item.imageUrl
    ? `<td width="140" valign="top" style="padding:0 16px 0 0;">
         <a href="${item.url}"><img src="${item.imageUrl}" width="140" alt="" style="display:block;width:140px;max-width:140px;height:auto;border:1px solid ${LINE};" /></a>
       </td>`
    : "";
  return `
<tr><td style="padding:0 32px 22px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    ${image}
    <td valign="top">
      ${item.category ? `<p style="margin:0 0 4px;font-family:${DISPLAY_FONT};font-weight:700;font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:${ACCENT_DARK};">${escapeHtml(item.category)}</p>` : ""}
      <a href="${item.url}" style="text-decoration:none;">
        <p style="margin:0 0 6px;font-family:${DISPLAY_FONT};font-weight:700;font-size:18px;line-height:1.25;color:${TEXT};">${escapeHtml(item.title)}</p>
      </a>
      <p style="margin:0 0 8px;font-family:${BODY_FONT};font-size:13.5px;line-height:1.55;color:${MUTED};">${escapeHtml(item.standfirst)}</p>
      <a href="${item.url}" style="font-family:${DISPLAY_FONT};font-weight:700;font-size:11.5px;letter-spacing:0.6px;text-transform:uppercase;color:${INK};text-decoration:none;border-bottom:2px solid ${ACCENT};">Read more →</a>
    </td>
  </tr></table>
</td></tr>`;
}

export type StandingRow = { position: number; name: string; sub: string; points: number };

function leaderboard(title: string, rows: StandingRow[]): string {
  if (!rows.length) return "";
  const body = rows
    .map(
      (r, i) => `
    <tr style="background:${i % 2 === 0 ? PAPER : PANEL};">
      <td style="padding:9px 12px;font-family:${MONO_FONT};font-weight:700;font-size:14px;color:${r.position <= 3 ? ACCENT_DARK : TEXT};width:34px;">${r.position}</td>
      <td style="padding:9px 12px;">
        <span style="display:block;font-family:${BODY_FONT};font-weight:bold;font-size:13.5px;color:${TEXT};">${escapeHtml(r.name)}</span>
        <span style="display:block;font-family:${BODY_FONT};font-size:11.5px;color:${FAINT};">${escapeHtml(r.sub)}</span>
      </td>
      <td align="right" style="padding:9px 12px;font-family:${MONO_FONT};font-weight:700;font-size:14px;color:${TEXT};white-space:nowrap;">${r.points.toFixed(0)}<span style="font-size:10px;color:${FAINT};"> PTS</span></td>
    </tr>`,
    )
    .join("");
  return `
<tr><td style="padding:0 32px 20px;">
  <p style="margin:0 0 8px;font-family:${DISPLAY_FONT};font-weight:700;font-size:12.5px;letter-spacing:0.8px;text-transform:uppercase;color:${TEXT};">${escapeHtml(title)}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};">
    <tr style="background:${INK};">
      <td style="padding:8px 12px;font-family:${DISPLAY_FONT};font-weight:700;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${ACCENT};">Pos</td>
      <td style="padding:8px 12px;font-family:${DISPLAY_FONT};font-weight:700;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${ACCENT};">Name</td>
      <td align="right" style="padding:8px 12px;font-family:${DISPLAY_FONT};font-weight:700;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${ACCENT};">Points</td>
    </tr>
    ${body}
  </table>
</td></tr>`;
}

export type SponsorLogo = { name: string; url: string; logoUrl: string };

function sponsorStrip(sponsors: SponsorLogo[]): string {
  if (!sponsors.length) return "";
  const logos = sponsors
    .slice(0, 6)
    .map(
      (s) =>
        `<td style="padding:0 14px;"><a href="${s.url}"><img src="${s.logoUrl}" alt="${escapeHtml(s.name)}" height="28" style="display:block;height:28px;width:auto;filter:grayscale(1);opacity:0.75;" /></a></td>`,
    )
    .join("");
  return `
<tr><td style="background:${PANEL};padding:20px 32px;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};">
  <p style="margin:0 0 12px;text-align:center;font-family:${DISPLAY_FONT};font-weight:700;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${FAINT};">Championship partners</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>${logos}</tr></table>
</td></tr>`;
}

function masthead(editionLine: string): string {
  return `
<tr><td style="background:${INK};padding:26px 32px 22px;">
  <p style="margin:0 0 2px;font-family:${DISPLAY_FONT};font-weight:700;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${FAINT};">CTR Sports</p>
  <p style="margin:0 0 8px;font-family:${DISPLAY_FONT};font-weight:700;font-size:34px;line-height:1;letter-spacing:0.5px;text-transform:uppercase;color:${ACCENT};">The Pit Wall</p>
  <p style="margin:0;font-family:${MONO_FONT};font-size:11px;letter-spacing:0.5px;text-transform:uppercase;color:${FAINT};">${escapeHtml(editionLine)}</p>
</td></tr>
<tr><td>${hazardStripe()}</td></tr>`;
}

function footer(unsubscribeUrl: string): string {
  return `
<tr><td>${hazardStripe(6, 32)}</td></tr>
<tr><td style="background:${INK};padding:22px 32px;">
  <p style="margin:0 0 6px;font-family:${BODY_FONT};font-size:11.5px;line-height:1.6;color:${FAINT};">
    You're receiving this because you subscribed to CTR Sports race-week updates.
  </p>
  <p style="margin:0;font-family:${BODY_FONT};font-size:11.5px;">
    <a href="${unsubscribeUrl}" style="color:${ACCENT};text-decoration:underline;">Unsubscribe</a>
    <span style="color:${FAINT};"> — one click, no account needed.</span>
  </p>
</td></tr>`;
}

function shell(inner: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:${PANEL};font-family:${BODY_FONT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PANEL};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" style="max-width:${px(WIDTH)};width:100%;background:${PAPER};">
        ${inner}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── Automated weekly digest ─────────────────────────────────────────────── */

export type NewsletterDigestInput = {
  editionLine: string; // e.g. "WEEKLY DIGEST · 31 AUG 2026"
  hero: {
    roundName: string;
    circuitLine: string;
    dateLine: string;
    teaser: string;
    imageUrl: string | null;
    scheduleUrl: string;
  } | null;
  news: NewsCard[];
  driverStandings: StandingRow[];
  constructorStandings: StandingRow[];
  sponsors: SponsorLogo[];
  unsubscribeUrl: string;
  webUrl: string;
};

export function newsletterDigestEmail(input: NewsletterDigestInput): Omit<EmailMessage, "to"> {
  const heroBlock = input.hero
    ? `
<tr><td style="padding:26px 32px 8px;">
  ${eyebrowChip("Next round")}
</td></tr>
${
  input.hero.imageUrl
    ? `<tr><td style="padding:14px 32px 0;"><img src="${input.hero.imageUrl}" width="576" alt="" style="display:block;width:100%;max-width:576px;height:auto;border:1px solid ${LINE};" /></td></tr>`
    : ""
}
<tr><td style="padding:14px 32px 4px;">
  <p style="margin:0 0 4px;font-family:${DISPLAY_FONT};font-weight:700;font-size:26px;line-height:1.1;letter-spacing:0.2px;text-transform:uppercase;color:${TEXT};">${escapeHtml(input.hero.roundName)}</p>
  <p style="margin:0 0 12px;font-family:${MONO_FONT};font-size:12.5px;color:${MUTED};">${escapeHtml(input.hero.circuitLine)} · ${escapeHtml(input.hero.dateLine)}</p>
  <p style="margin:0 0 18px;font-family:${BODY_FONT};font-size:14px;line-height:1.6;color:${MUTED};">${escapeHtml(input.hero.teaser)}</p>
  ${ctaButton(input.hero.scheduleUrl, "Full weekend schedule")}
</td></tr>
<tr><td style="padding:24px 32px 0;"><table role="presentation" width="100%"><tr><td style="border-top:1px solid ${LINE};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>`
    : "";

  const newsBlock = input.news.length
    ? sectionHeading("In the paddock") + input.news.map(newsCardRow).join("")
    : "";

  const standingsBlock =
    input.driverStandings.length || input.constructorStandings.length
      ? sectionHeading("Timing screen") +
        leaderboard("Drivers' championship", input.driverStandings) +
        leaderboard("Constructors' championship", input.constructorStandings)
      : "";

  const html = shell(
    masthead(input.editionLine) +
      heroBlock +
      newsBlock +
      standingsBlock +
      sponsorStrip(input.sponsors) +
      footer(input.unsubscribeUrl),
  );

  const textParts: string[] = ["THE PIT WALL — " + input.editionLine, ""];
  if (input.hero) {
    textParts.push(
      `NEXT ROUND: ${input.hero.roundName}`,
      `${input.hero.circuitLine} · ${input.hero.dateLine}`,
      input.hero.teaser,
      `Schedule: ${input.hero.scheduleUrl}`,
      "",
    );
  }
  if (input.news.length) {
    textParts.push("IN THE PADDOCK");
    for (const n of input.news) textParts.push(`- ${n.title} — ${n.url}`);
    textParts.push("");
  }
  if (input.driverStandings.length) {
    textParts.push(
      "DRIVERS' CHAMPIONSHIP",
      ...input.driverStandings.map((r) => `${r.position}. ${r.name} — ${r.points} pts`),
      "",
    );
  }
  if (input.constructorStandings.length) {
    textParts.push(
      "CONSTRUCTORS' CHAMPIONSHIP",
      ...input.constructorStandings.map((r) => `${r.position}. ${r.name} — ${r.points} pts`),
      "",
    );
  }
  textParts.push(`Unsubscribe: ${input.unsubscribeUrl}`);

  return {
    subject: input.hero
      ? `The Pit Wall: ${input.hero.roundName} this week`
      : "The Pit Wall — this week at CTR Sports",
    html,
    text: textParts.join("\n"),
  };
}

/* ── Admin-composed one-off broadcast ────────────────────────────────────── */

/**
 * Adds inline styles to the bounded tag set sanitize.ts allows through
 * (admin/src/components/editor/sanitize.ts) so admin-authored copy inherits
 * this newsletter's type system. Email clients ignore <style> blocks and
 * external stylesheets — everything has to land as a style="" attribute.
 *
 * Regex-based rather than a DOM parse: the tag alphabet is small and fixed
 * (the sanitizer's allowlist), letting a single targeted pass per tag stay
 * correct without pulling in a parser dependency this package doesn't have.
 * Each pattern requires "<tag" to be followed by whitespace, "/" or ">" —
 * never text — so "<table" can never match inside "<th"/"<td".
 */
const NO_ATTR_STYLES: Record<string, string> = {
  h1: `font-family:${DISPLAY_FONT};font-weight:700;font-size:24px;line-height:1.2;text-transform:uppercase;color:${TEXT};margin:26px 0 10px;`,
  h2: `font-family:${DISPLAY_FONT};font-weight:700;font-size:20px;line-height:1.25;text-transform:uppercase;color:${TEXT};margin:24px 0 10px;`,
  h3: `font-family:${DISPLAY_FONT};font-weight:700;font-size:16px;line-height:1.3;text-transform:uppercase;color:${TEXT};margin:20px 0 8px;`,
  h4: `font-family:${DISPLAY_FONT};font-weight:700;font-size:14px;line-height:1.3;text-transform:uppercase;color:${MUTED};margin:18px 0 6px;`,
  p: `font-family:${BODY_FONT};font-size:14.5px;line-height:1.65;color:${MUTED};margin:0 0 14px;`,
  strong: `color:${TEXT};`,
  em: "",
  u: "",
  s: "",
  ul: `margin:0 0 14px;padding-left:22px;font-family:${BODY_FONT};font-size:14.5px;line-height:1.65;color:${MUTED};`,
  ol: `margin:0 0 14px;padding-left:22px;font-family:${BODY_FONT};font-size:14.5px;line-height:1.65;color:${MUTED};`,
  li: "margin:0 0 6px;",
  blockquote: `margin:0 0 16px;padding:2px 0 2px 16px;border-left:3px solid ${ACCENT};font-family:${BODY_FONT};font-style:italic;font-size:14.5px;color:${TEXT};`,
  figure: "margin:0 0 16px;",
  figcaption: `font-family:${BODY_FONT};font-size:11.5px;color:${FAINT};margin-top:6px;`,
  table: `border-collapse:collapse;width:100%;margin:0 0 16px;font-family:${BODY_FONT};font-size:13.5px;`,
  thead: "",
  tbody: "",
  tr: "",
  hr: `border:none;border-top:1px solid ${LINE};margin:20px 0;`,
};

function styleAttr(name: keyof typeof NO_ATTR_STYLES): string {
  return NO_ATTR_STYLES[name] ? ` style="${NO_ATTR_STYLES[name]}"` : "";
}

function addStyle(html: string, tag: string, style: string): string {
  return html.replace(new RegExp(`<${tag}(?=[\\s/>])([^>]*)>`, "g"), (_m, attrs: string) => {
    // attrs already contains a leading space when non-empty (regex captured it)
    return `<${tag}${attrs} style="${style}">`;
  });
}

export function emailifyBodyHtml(html: string): string {
  let out = html;
  for (const tag of Object.keys(NO_ATTR_STYLES)) {
    const style = NO_ATTR_STYLES[tag];
    if (style) out = addStyle(out, tag, style);
  }
  out = addStyle(out, "a", `color:${INK};text-decoration:underline;text-decoration-color:${ACCENT};`);
  out = addStyle(out, "img", "display:block;max-width:100%;height:auto;margin:0 0 16px;");
  out = addStyle(out, "th", `padding:8px 10px;text-align:left;background:${INK};color:${ACCENT};font-family:${DISPLAY_FONT};font-weight:700;font-size:10.5px;letter-spacing:0.6px;text-transform:uppercase;`);
  out = addStyle(out, "td", `padding:8px 10px;border-bottom:1px solid ${LINE};color:${MUTED};`);
  return out;
}

export type NewsletterBroadcastInput = {
  editionLine: string;
  subject: string;
  bodyHtml: string; // already sanitized (sanitizeBodyHtml) — this function only adds styling
  sponsors: SponsorLogo[];
  unsubscribeUrl: string;
};

export function newsletterBroadcastEmail(input: NewsletterBroadcastInput): Omit<EmailMessage, "to"> {
  const styledBody = emailifyBodyHtml(input.bodyHtml);
  const html = shell(
    masthead(input.editionLine) +
      `<tr><td style="padding:26px 32px 4px;">
         <p style="margin:0;font-family:${DISPLAY_FONT};font-weight:700;font-size:24px;line-height:1.15;text-transform:uppercase;color:${TEXT};">${escapeHtml(input.subject)}</p>
       </td></tr>
       <tr><td style="padding:16px 32px 4px;">${styledBody}</td></tr>` +
      sponsorStrip(input.sponsors) +
      footer(input.unsubscribeUrl),
  );

  // Plain-text: strip tags crudely — good enough as a fallback, matching how
  // roundReminderEmail/rsvpConfirmationEmail already keep their .text simple.
  const text = input.bodyHtml
    .replace(/<(h[1-4]|p|li|br|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    subject: input.subject,
    html,
    text: `THE PIT WALL — ${input.editionLine}\n\n${input.subject}\n\n${text}\n\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}
