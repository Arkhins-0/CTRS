import type { EmailMessage } from "./client";

/** Minimal HTML-escape for user-supplied strings interpolated into templates. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Shared CTR-branded shell: carbon header with the accent kick, white body,
 * plain-table layout that renders everywhere. Inline styles only — email
 * clients ignore stylesheets.
 */
function layout(title: string, bodyHtml: string, footerNote: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f7f4f1;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4f1;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:#15151E;padding:20px 28px;border-top:4px solid #F7D619;">
            <span style="color:#ffffff;font-size:18px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">CTR Sports</span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:28px;">
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#15151E;text-transform:uppercase;">${title}</h1>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px;color:#67676D;font-size:12px;line-height:1.5;">
            ${footerNote}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const button = (href: string, label: string): string =>
  `<a href="${href}" style="display:inline-block;background:#F7D619;color:#15151E;font-weight:900;text-transform:uppercase;font-size:14px;letter-spacing:0.5px;padding:12px 24px;text-decoration:none;">${label}</a>`;

const paragraph = (html: string): string =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">${html}</p>`;

/* ── Newsletter double-opt-in ────────────────────────────────────────────── */

export function newsletterConfirmEmail(input: { confirmUrl: string }): Omit<EmailMessage, "to"> {
  const html = layout(
    "Confirm your subscription",
    paragraph(
      "You (or someone using your address) asked for the CTR Sports newsletter — one email per race week with the schedule, results and standings.",
    ) +
      paragraph(button(input.confirmUrl, "Confirm subscription")) +
      paragraph(
        `Or open this link: <a href="${input.confirmUrl}" style="color:#15151E;">${input.confirmUrl}</a>`,
      ),
    "If you didn't request this, ignore this email and nothing will be sent.",
  );
  return {
    subject: "Confirm your CTR Sports newsletter subscription",
    html,
    text: `Confirm your CTR Sports newsletter subscription:\n${input.confirmUrl}\n\nIf you didn't request this, ignore this email.`,
  };
}

/* ── RSVP confirmation ───────────────────────────────────────────────────── */

export function rsvpConfirmationEmail(input: {
  fanName: string;
  roundName: string;
  circuitLine: string;
  dateLine: string;
  roundUrl: string;
  calendarUrl: string;
}): Omit<EmailMessage, "to"> {
  const html = layout(
    `You're going — ${escapeHtml(input.roundName)}`,
    paragraph(`Hi ${escapeHtml(input.fanName)},`) +
      paragraph(
        `Your spot is noted for <strong>${escapeHtml(input.roundName)}</strong> at ${escapeHtml(input.circuitLine)}${
          input.dateLine ? ` — ${escapeHtml(input.dateLine)}` : ""
        }.`,
      ) +
      paragraph(button(input.roundUrl, "Weekend schedule")) +
      paragraph(
        `<a href="${input.calendarUrl}" style="color:#15151E;">Add the sessions to your calendar (.ics)</a>`,
      ),
    "You can change your RSVP any time on the round page.",
  );
  return {
    subject: `You're going: ${input.roundName}`,
    html,
    text: `Hi ${input.fanName},\n\nYour RSVP for ${input.roundName} (${input.circuitLine}${
      input.dateLine ? `, ${input.dateLine}` : ""
    }) is confirmed.\n\nWeekend schedule: ${input.roundUrl}\nAdd to calendar: ${input.calendarUrl}\n\nYou can change your RSVP any time on the round page.`,
  };
}

/* ── Race-weekend reminder (cron) ────────────────────────────────────────── */

export function roundReminderEmail(input: {
  fanName: string;
  roundName: string;
  circuitLine: string;
  firstSessionLine: string;
  roundUrl: string;
}): Omit<EmailMessage, "to"> {
  const html = layout(
    `Race weekend incoming — ${escapeHtml(input.roundName)}`,
    paragraph(`Hi ${escapeHtml(input.fanName)},`) +
      paragraph(
        `<strong>${escapeHtml(input.roundName)}</strong> at ${escapeHtml(input.circuitLine)} starts soon — ${escapeHtml(input.firstSessionLine)}.`,
      ) +
      paragraph(button(input.roundUrl, "See the timetable")),
    "You're getting this because you RSVP'd to this round. Change your RSVP on the round page.",
  );
  return {
    subject: `Starts soon: ${input.roundName}`,
    html,
    text: `Hi ${input.fanName},\n\n${input.roundName} at ${input.circuitLine} starts soon — ${input.firstSessionLine}.\n\nTimetable: ${input.roundUrl}\n\nYou're getting this because you RSVP'd to this round.`,
  };
}
