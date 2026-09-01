import type { EmailMessage } from "./client";
import { escapeHtml } from "./templates";
import {
  brandMark,
  COLOR,
  ctaButton,
  eyebrow,
  FONT,
  FONT_FACES,
  hazardStripe,
  socialBadges,
  type SocialLink,
} from "./brand";

/**
 * "The Pit Wall" — CTR's editorial newsletter shell.
 *
 * Deliberately NOT a reskin of the plain transactional layout() in
 * templates.ts: those are notices (reset a password, confirm an address) and
 * read as one paragraph and a button. This is the thing people actually
 * signed up to receive, so it earns real front-page treatment — a masthead,
 * a leaderboard-styled standings table, hazard-tape dividers borrowed from
 * the pit lane, condensed caps for headlines. It shares brand.ts with the
 * plain notices — same dark palette, same fonts, same logo — so the two
 * families read as one product; only the amount of content structure differs.
 *
 * Pure inline-styled tables throughout (no CSS grid, no gradients): Outlook's
 * Word rendering engine supports neither.
 */

const WIDTH = 640;

function sectionHeading(label: string): string {
  return `
<tr><td style="padding:30px 32px 12px;">
  ${eyebrow(label)}
</td></tr>`;
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
         <a href="${item.url}"><img src="${item.imageUrl}" width="140" alt="" style="display:block;width:140px;max-width:140px;height:auto;border:1px solid ${COLOR.line};" /></a>
       </td>`
    : "";
  return `
<tr><td style="padding:0 32px 22px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    ${image}
    <td valign="top">
      ${item.category ? `<p style="margin:0 0 4px;font-family:${FONT.display};font-weight:600;font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:${COLOR.accent};">${escapeHtml(item.category)}</p>` : ""}
      <a href="${item.url}" style="text-decoration:none;">
        <p style="margin:0 0 6px;font-family:${FONT.display};font-weight:600;font-size:18px;line-height:1.25;color:${COLOR.fg};">${escapeHtml(item.title)}</p>
      </a>
      <p style="margin:0 0 8px;font-family:${FONT.body};font-size:13.5px;line-height:1.55;color:${COLOR.fgMuted};">${escapeHtml(item.standfirst)}</p>
      <a href="${item.url}" style="font-family:${FONT.display};font-weight:600;font-size:11.5px;letter-spacing:0.6px;text-transform:uppercase;color:${COLOR.fg};text-decoration:none;border-bottom:2px solid ${COLOR.accent};">Read more →</a>
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
    <tr style="background:${i % 2 === 0 ? COLOR.surface : COLOR.panel};" bgcolor="${i % 2 === 0 ? COLOR.surface : COLOR.panel}">
      <td style="padding:10px 12px;font-family:${FONT.mono};font-weight:700;font-size:14px;color:${r.position <= 3 ? COLOR.accent : COLOR.fg};width:34px;">${r.position}</td>
      <td style="padding:10px 12px;">
        <span style="display:block;font-family:${FONT.body};font-weight:600;font-size:13.5px;color:${COLOR.fg};">${escapeHtml(r.name)}</span>
        <span style="display:block;font-family:${FONT.body};font-size:11.5px;color:${COLOR.fgFaint};">${escapeHtml(r.sub)}</span>
      </td>
      <td align="right" style="padding:10px 12px;font-family:${FONT.mono};font-weight:700;font-size:14px;color:${COLOR.fg};white-space:nowrap;">${r.points.toFixed(0)}<span style="font-size:10px;color:${COLOR.fgFaint};"> PTS</span></td>
    </tr>`,
    )
    .join("");
  return `
<tr><td style="padding:0 32px 20px;">
  <p style="margin:0 0 8px;font-family:${FONT.display};font-weight:600;font-size:12.5px;letter-spacing:0.8px;text-transform:uppercase;color:${COLOR.fg};">${escapeHtml(title)}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLOR.line};">
    <tr style="background:${COLOR.page};" bgcolor="${COLOR.page}">
      <td style="padding:9px 12px;font-family:${FONT.display};font-weight:600;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${COLOR.accent};">Pos</td>
      <td style="padding:9px 12px;font-family:${FONT.display};font-weight:600;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${COLOR.accent};">Name</td>
      <td align="right" style="padding:9px 12px;font-family:${FONT.display};font-weight:600;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${COLOR.accent};">Points</td>
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
        // White plate behind every logo: partner artwork is drawn for light
        // grounds (JK Tyre/FMSCI are near-black) and vanished on the dark
        // band — same fix as the site footer's partner tiles.
        `<td style="padding:0 7px;"><a href="${s.url}" style="display:block;background:#ffffff;border-radius:3px;padding:6px 10px;"><img src="${s.logoUrl}" alt="${escapeHtml(s.name)}" height="24" style="display:block;height:24px;width:auto;" /></a></td>`,
    )
    .join("");
  return `
<tr><td style="background:${COLOR.page};padding:22px 32px;border-top:1px solid ${COLOR.line};border-bottom:1px solid ${COLOR.line};" bgcolor="${COLOR.page}">
  <p style="margin:0 0 12px;text-align:center;font-family:${FONT.display};font-weight:600;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${COLOR.fgFaint};">Championship partners</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>${logos}</tr></table>
</td></tr>`;
}

function masthead(editionLine: string): string {
  return `
<tr><td style="padding:28px 32px 22px;" bgcolor="${COLOR.surface}">
  ${brandMark(132)}
  <p style="margin:16px 0 0;font-family:${FONT.display};font-weight:700;font-size:36px;line-height:1;letter-spacing:0.5px;text-transform:uppercase;color:${COLOR.accent};">The Pit Wall</p>
  <p style="margin:8px 0 0;font-family:${FONT.mono};font-size:11px;letter-spacing:0.5px;text-transform:uppercase;color:${COLOR.fgFaint};">${escapeHtml(editionLine)}</p>
</td></tr>
<tr><td>${hazardStripe(WIDTH)}</td></tr>`;
}

function footer(unsubscribeUrl: string, socialLinks: SocialLink[] = []): string {
  return `
<tr><td>${hazardStripe(WIDTH)}</td></tr>
<tr><td style="padding:26px 32px 22px;text-align:center;" bgcolor="${COLOR.page}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    ${brandMark(96)}
  </td></tr></table>
  ${socialBadges(socialLinks)}
  <p style="margin:18px 0 6px;font-family:${FONT.body};font-size:11.5px;line-height:1.6;color:${COLOR.fgFaint};">
    You're receiving this because you subscribed to CTR Sports race-week updates.
  </p>
  <p style="margin:0;font-family:${FONT.body};font-size:11.5px;">
    <a href="${unsubscribeUrl}" style="color:${COLOR.accent};text-decoration:underline;">Unsubscribe</a>
    <span style="color:${COLOR.fgFaint};"> — one click, no account needed.</span>
  </p>
</td></tr>`;
}

function shell(inner: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <style>${FONT_FACES}</style>
</head>
<body style="margin:0;padding:0;background:${COLOR.page};font-family:${FONT.body};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.page};" bgcolor="${COLOR.page}">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" style="max-width:${WIDTH}px;width:100%;background:${COLOR.surface};" bgcolor="${COLOR.surface}">
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
  socialLinks?: SocialLink[];
  unsubscribeUrl: string;
  webUrl: string;
};

export function newsletterDigestEmail(input: NewsletterDigestInput): Omit<EmailMessage, "to"> {
  const heroBlock = input.hero
    ? `
<tr><td style="padding:26px 32px 8px;">
  ${eyebrow("Next round")}
</td></tr>
${
  input.hero.imageUrl
    ? `<tr><td style="padding:14px 32px 0;"><img src="${input.hero.imageUrl}" width="576" alt="" style="display:block;width:100%;max-width:576px;height:auto;border:1px solid ${COLOR.line};" /></td></tr>`
    : ""
}
<tr><td style="padding:14px 32px 4px;">
  <p style="margin:0 0 4px;font-family:${FONT.display};font-weight:700;font-size:26px;line-height:1.1;letter-spacing:0.2px;text-transform:uppercase;color:${COLOR.fg};">${escapeHtml(input.hero.roundName)}</p>
  <p style="margin:0 0 12px;font-family:${FONT.mono};font-size:12.5px;color:${COLOR.fgMuted};">${escapeHtml(input.hero.circuitLine)} · ${escapeHtml(input.hero.dateLine)}</p>
  <p style="margin:0 0 18px;font-family:${FONT.body};font-size:14px;line-height:1.6;color:${COLOR.fgMuted};">${escapeHtml(input.hero.teaser)}</p>
  ${ctaButton(input.hero.scheduleUrl, "Full weekend schedule")}
</td></tr>
<tr><td style="padding:24px 32px 0;"><table role="presentation" width="100%"><tr><td style="border-top:1px solid ${COLOR.line};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>`
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
      footer(input.unsubscribeUrl, input.socialLinks),
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
 * this newsletter's type system. Email clients ignore <style> blocks scoped
 * to arbitrary selectors — everything has to land as a style="" attribute.
 *
 * Regex-based rather than a DOM parse: the tag alphabet is small and fixed
 * (the sanitizer's allowlist), letting a single targeted pass per tag stay
 * correct without pulling in a parser dependency this package doesn't have.
 * Each pattern requires "<tag" to be followed by whitespace, "/" or ">" —
 * never text — so "<table" can never match inside "<th"/"<td".
 */
const NO_ATTR_STYLES: Record<string, string> = {
  h1: `font-family:${FONT.display};font-weight:600;font-size:24px;line-height:1.2;text-transform:uppercase;color:${COLOR.fg};margin:26px 0 10px;`,
  h2: `font-family:${FONT.display};font-weight:600;font-size:20px;line-height:1.25;text-transform:uppercase;color:${COLOR.fg};margin:24px 0 10px;`,
  h3: `font-family:${FONT.display};font-weight:600;font-size:16px;line-height:1.3;text-transform:uppercase;color:${COLOR.fg};margin:20px 0 8px;`,
  h4: `font-family:${FONT.display};font-weight:600;font-size:14px;line-height:1.3;text-transform:uppercase;color:${COLOR.fgMuted};margin:18px 0 6px;`,
  p: `font-family:${FONT.body};font-size:14.5px;line-height:1.65;color:${COLOR.fgMuted};margin:0 0 14px;`,
  strong: `color:${COLOR.fg};`,
  em: "",
  u: "",
  s: "",
  ul: `margin:0 0 14px;padding-left:22px;font-family:${FONT.body};font-size:14.5px;line-height:1.65;color:${COLOR.fgMuted};`,
  ol: `margin:0 0 14px;padding-left:22px;font-family:${FONT.body};font-size:14.5px;line-height:1.65;color:${COLOR.fgMuted};`,
  li: "margin:0 0 6px;",
  blockquote: `margin:0 0 16px;padding:2px 0 2px 16px;border-left:3px solid ${COLOR.accent};font-family:${FONT.body};font-style:italic;font-size:14.5px;color:${COLOR.fg};`,
  figure: "margin:0 0 16px;",
  figcaption: `font-family:${FONT.body};font-size:11.5px;color:${COLOR.fgFaint};margin-top:6px;`,
  table: `border-collapse:collapse;width:100%;margin:0 0 16px;font-family:${FONT.body};font-size:13.5px;`,
  thead: "",
  tbody: "",
  tr: "",
  hr: `border:none;border-top:1px solid ${COLOR.line};margin:20px 0;`,
};

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
  out = addStyle(out, "a", `color:${COLOR.accent};text-decoration:underline;`);
  out = addStyle(out, "img", "display:block;max-width:100%;height:auto;margin:0 0 16px;");
  out = addStyle(out, "th", `padding:8px 10px;text-align:left;background:${COLOR.page};color:${COLOR.accent};font-family:${FONT.display};font-weight:600;font-size:10.5px;letter-spacing:0.6px;text-transform:uppercase;`);
  out = addStyle(out, "td", `padding:8px 10px;border-bottom:1px solid ${COLOR.line};color:${COLOR.fgMuted};`);
  return out;
}

export type NewsletterBroadcastInput = {
  editionLine: string;
  subject: string;
  bodyHtml: string; // already sanitized (sanitizeBodyHtml) — this function only adds styling
  sponsors: SponsorLogo[];
  socialLinks?: SocialLink[];
  unsubscribeUrl: string;
};

export function newsletterBroadcastEmail(input: NewsletterBroadcastInput): Omit<EmailMessage, "to"> {
  const styledBody = emailifyBodyHtml(input.bodyHtml);
  const html = shell(
    masthead(input.editionLine) +
      `<tr><td style="padding:26px 32px 4px;">
         <p style="margin:0;font-family:${FONT.display};font-weight:700;font-size:24px;line-height:1.15;text-transform:uppercase;color:${COLOR.fg};">${escapeHtml(input.subject)}</p>
       </td></tr>
       <tr><td style="padding:16px 32px 4px;">${styledBody}</td></tr>` +
      sponsorStrip(input.sponsors) +
      footer(input.unsubscribeUrl, input.socialLinks),
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
