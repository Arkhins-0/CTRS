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

/* ── Admin account lifecycle ─────────────────────────────────────────────── */

export function adminPasswordResetEmail(input: {
  displayName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Omit<EmailMessage, "to"> {
  const html = layout(
    "Reset your password",
    paragraph(`Hi ${escapeHtml(input.displayName)},`) +
      paragraph(
        `Someone asked to reset the password on your CTR Sports admin account. This link expires in ${input.expiresInMinutes} minutes and can only be used once.`,
      ) +
      paragraph(button(input.resetUrl, "Reset password")) +
      paragraph(
        `Or open this link: <a href="${input.resetUrl}" style="color:#15151E;">${input.resetUrl}</a>`,
      ),
    "If you didn't request this, ignore this email — your password will not change. Signing in normally also invalidates the link.",
  );
  return {
    subject: "Reset your CTR Sports admin password",
    html,
    text: `Hi ${input.displayName},\n\nReset your CTR Sports admin password (expires in ${input.expiresInMinutes} minutes, single use):\n${input.resetUrl}\n\nIf you didn't request this, ignore this email.`,
  };
}

export function adminEmailChangeEmail(input: {
  displayName: string;
  confirmUrl: string;
  newEmail: string;
}): Omit<EmailMessage, "to"> {
  const html = layout(
    "Confirm your new address",
    paragraph(`Hi ${escapeHtml(input.displayName)},`) +
      paragraph(
        `Confirm that <strong>${escapeHtml(input.newEmail)}</strong> should become the sign-in address for your CTR Sports admin account.`,
      ) +
      paragraph(button(input.confirmUrl, "Confirm new address")) +
      paragraph(
        `Or open this link: <a href="${input.confirmUrl}" style="color:#15151E;">${input.confirmUrl}</a>`,
      ),
    "Until you confirm, your old address keeps working. If you didn't request this, ignore this email.",
  );
  return {
    subject: "Confirm your new CTR Sports admin address",
    html,
    text: `Hi ${input.displayName},\n\nConfirm ${input.newEmail} as the sign-in address for your CTR Sports admin account:\n${input.confirmUrl}\n\nIf you didn't request this, ignore this email.`,
  };
}

/**
 * Sent to the OLD address after an email change lands. This is the tripwire
 * for an account takeover: the person who still controls the old inbox finds
 * out immediately, even though they can no longer sign in with it.
 */
export function adminEmailChangedNoticeEmail(input: {
  displayName: string;
  newEmail: string;
  supportEmail: string;
}): Omit<EmailMessage, "to"> {
  const html = layout(
    "Your sign-in address changed",
    paragraph(`Hi ${escapeHtml(input.displayName)},`) +
      paragraph(
        `The sign-in address on your CTR Sports admin account was changed to <strong>${escapeHtml(input.newEmail)}</strong>. All existing sessions were signed out.`,
      ) +
      paragraph(
        `If this wasn't you, contact a Super Admin immediately at <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#15151E;">${escapeHtml(input.supportEmail)}</a>.`,
      ),
    "This is a security notification sent to your previous address.",
  );
  return {
    subject: "Your CTR Sports admin sign-in address changed",
    html,
    text: `Hi ${input.displayName},\n\nThe sign-in address on your CTR Sports admin account was changed to ${input.newEmail}. All existing sessions were signed out.\n\nIf this wasn't you, contact a Super Admin immediately at ${input.supportEmail}.`,
  };
}

/** Sent after any password change so a silent takeover cannot go unnoticed. */
export function adminPasswordChangedNoticeEmail(input: {
  displayName: string;
  supportEmail: string;
}): Omit<EmailMessage, "to"> {
  const html = layout(
    "Your password changed",
    paragraph(`Hi ${escapeHtml(input.displayName)},`) +
      paragraph(
        "The password on your CTR Sports admin account was just changed, and every other session was signed out.",
      ) +
      paragraph(
        `If this wasn't you, contact a Super Admin immediately at <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:#15151E;">${escapeHtml(input.supportEmail)}</a>.`,
      ),
    "This is a security notification.",
  );
  return {
    subject: "Your CTR Sports admin password changed",
    html,
    text: `Hi ${input.displayName},\n\nThe password on your CTR Sports admin account was just changed and every other session was signed out.\n\nIf this wasn't you, contact a Super Admin immediately at ${input.supportEmail}.`,
  };
}

/* ── Member invitations ──────────────────────────────────────────────────── */

export function memberInviteEmail(input: {
  displayName: string;
  inviterName: string;
  teamName: string | null;
  roleLabel: string;
  acceptUrl: string;
  expiresInDays: number;
}): Omit<EmailMessage, "to"> {
  const where = input.teamName
    ? `<strong>${escapeHtml(input.teamName)}</strong>`
    : "the CTR Sports organisation";
  const html = layout(
    "You're invited",
    paragraph(`Hi ${escapeHtml(input.displayName)},`) +
      paragraph(
        `${escapeHtml(input.inviterName)} has invited you to join ${where} on the CTR Sports console as <strong>${escapeHtml(input.roleLabel)}</strong>.`,
      ) +
      paragraph(
        "Set a password to activate your account. You can then install the console to your home screen for race-day announcements.",
      ) +
      paragraph(button(input.acceptUrl, "Accept invitation")) +
      paragraph(
        `Or open this link: <a href="${input.acceptUrl}" style="color:#15151E;">${input.acceptUrl}</a>`,
      ),
    `This invitation expires in ${input.expiresInDays} days and can only be used once. If you weren't expecting it, ignore this email.`,
  );
  return {
    subject: `You're invited to ${input.teamName ?? "CTR Sports"}`,
    html,
    text: `Hi ${input.displayName},\n\n${input.inviterName} invited you to join ${input.teamName ?? "the CTR Sports organisation"} as ${input.roleLabel}.\n\nSet a password to activate your account:\n${input.acceptUrl}\n\nExpires in ${input.expiresInDays} days, single use.`,
  };
}
