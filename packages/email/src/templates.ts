import type { EmailMessage } from "./client";
import { brandMark, COLOR, ctaButton, FONT, FONT_FACES, hazardStripe } from "./brand";

/** Minimal HTML-escape for user-supplied strings interpolated into templates. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const WIDTH = 560;

/**
 * Shared CTR-branded shell for every notice — password resets, invitations,
 * account security alerts. Dark throughout on purpose (see brand.ts for why
 * these are the exact admin-console tokens), one message, one card, one call
 * to action. The newsletter in newsletter.ts is the elaborate member of this
 * family; these stay deliberately plain — a security notice earns attention
 * by being unmistakable, not by being decorated.
 *
 * <meta name="color-scheme"/"supported-color-schemes"> tells clients that DO
 * respect them (Apple Mail, some Outlook builds) that this design already IS
 * dark, so they don't attempt their own dark-mode re-colouring on top of it.
 */
function layout(title: string, bodyHtml: string, footerNote: string): string {
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
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" style="max-width:${WIDTH}px;width:100%;background:${COLOR.surface};" bgcolor="${COLOR.surface}">
        <tr>
          <td style="padding:24px 30px 20px;">
            ${brandMark(116)}
          </td>
        </tr>
        <tr><td>${hazardStripe(WIDTH)}</td></tr>
        <tr>
          <td style="padding:32px 30px 8px;">
            <h1 style="margin:0 0 18px;font-family:${FONT.display};font-weight:600;font-size:22px;line-height:1.25;letter-spacing:0.2px;text-transform:uppercase;color:${COLOR.fg};">${title}</h1>
            ${bodyHtml}
          </td>
        </tr>
        <tr><td style="padding:8px 30px 0;"><table role="presentation" width="100%"><tr><td style="border-top:1px solid ${COLOR.line};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
        <tr>
          <td style="padding:18px 30px 26px;color:${COLOR.fgFaint};font-family:${FONT.body};font-size:12.5px;line-height:1.6;">
            ${footerNote}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const button = (href: string, label: string): string => ctaButton(href, label);

const paragraph = (html: string): string =>
  `<p style="margin:0 0 16px;font-family:${FONT.body};font-size:15px;line-height:1.65;color:${COLOR.fgMuted};">${html}</p>`;

/* ── Newsletter double-opt-in ────────────────────────────────────────────── */

export function newsletterConfirmEmail(input: { confirmUrl: string }): Omit<EmailMessage, "to"> {
  const html = layout(
    "Confirm your subscription",
    paragraph(
      "You (or someone using your address) asked for the CTR Sports newsletter — one email per race week with the schedule, results and standings.",
    ) +
      paragraph(button(input.confirmUrl, "Confirm subscription")) +
      paragraph(
        `Or open this link: <a href="${input.confirmUrl}" style="color:${COLOR.accent};">${input.confirmUrl}</a>`,
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
        `<a href="${input.calendarUrl}" style="color:${COLOR.accent};">Add the sessions to your calendar (.ics)</a>`,
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
        `Or open this link: <a href="${input.resetUrl}" style="color:${COLOR.accent};">${input.resetUrl}</a>`,
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
        `Or open this link: <a href="${input.confirmUrl}" style="color:${COLOR.accent};">${input.confirmUrl}</a>`,
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
        `If this wasn't you, contact a Super Admin immediately at <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:${COLOR.accent};">${escapeHtml(input.supportEmail)}</a>.`,
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
        `If this wasn't you, contact a Super Admin immediately at <a href="mailto:${escapeHtml(input.supportEmail)}" style="color:${COLOR.accent};">${escapeHtml(input.supportEmail)}</a>.`,
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
        `Or open this link: <a href="${input.acceptUrl}" style="color:${COLOR.accent};">${input.acceptUrl}</a>`,
      ),
    `This invitation expires in ${input.expiresInDays} days and can only be used once. If you weren't expecting it, ignore this email.`,
  );
  return {
    subject: `You're invited to ${input.teamName ?? "CTR Sports"}`,
    html,
    text: `Hi ${input.displayName},\n\n${input.inviterName} invited you to join ${input.teamName ?? "the CTR Sports organisation"} as ${input.roleLabel}.\n\nSet a password to activate your account:\n${input.acceptUrl}\n\nExpires in ${input.expiresInDays} days, single use.`,
  };
}

/* ── Member account lifecycle ────────────────────────────────────────────── */

export function memberPasswordResetEmail(input: {
  displayName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Omit<EmailMessage, "to"> {
  const html = layout(
    "Reset your password",
    paragraph(`Hi ${escapeHtml(input.displayName)},`) +
      paragraph(
        `Someone asked to reset the password on your CTR Sports member account. This link expires in ${input.expiresInMinutes} minutes and can only be used once.`,
      ) +
      paragraph(button(input.resetUrl, "Reset password")) +
      paragraph(
        `Or open this link: <a href="${input.resetUrl}" style="color:${COLOR.accent};">${input.resetUrl}</a>`,
      ),
    "If you didn't request this, ignore this email — your password will not change.",
  );
  return {
    subject: "Reset your CTR Sports member password",
    html,
    text: `Hi ${input.displayName},\n\nReset your CTR Sports member password (expires in ${input.expiresInMinutes} minutes, single use):\n${input.resetUrl}\n\nIf you didn't request this, ignore this email.`,
  };
}

/** Sent after any member password change so a silent takeover cannot go unnoticed. */
export function memberPasswordChangedNoticeEmail(input: {
  displayName: string;
}): Omit<EmailMessage, "to"> {
  const html = layout(
    "Your password changed",
    paragraph(`Hi ${escapeHtml(input.displayName)},`) +
      paragraph(
        "The password on your CTR Sports member account was just changed, and every other session was signed out.",
      ) +
      paragraph("If this wasn't you, contact your team admin or CTR staff immediately."),
    "This is a security notification.",
  );
  return {
    subject: "Your CTR Sports member password changed",
    html,
    text: `Hi ${input.displayName},\n\nThe password on your CTR Sports member account was just changed and every other session was signed out.\n\nIf this wasn't you, contact your team admin or CTR staff immediately.`,
  };
}

/* ── Fan account lifecycle ───────────────────────────────────────────────── */

export function fanPasswordResetEmail(input: {
  displayName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Omit<EmailMessage, "to"> {
  const html = layout(
    "Reset your password",
    paragraph(`Hi ${escapeHtml(input.displayName)},`) +
      paragraph(
        `Someone asked to reset the password on your CTR Sports fan zone account. This link expires in ${input.expiresInMinutes} minutes and can only be used once.`,
      ) +
      paragraph(button(input.resetUrl, "Reset password")) +
      paragraph(
        `Or open this link: <a href="${input.resetUrl}" style="color:${COLOR.accent};">${input.resetUrl}</a>`,
      ),
    "If you didn't request this, ignore this email — your password will not change.",
  );
  return {
    subject: "Reset your CTR Sports password",
    html,
    text: `Hi ${input.displayName},\n\nReset your CTR Sports fan zone password (expires in ${input.expiresInMinutes} minutes, single use):\n${input.resetUrl}\n\nIf you didn't request this, ignore this email.`,
  };
}

/** Sent after any fan password change so a silent takeover cannot go unnoticed. */
export function fanPasswordChangedNoticeEmail(input: {
  displayName: string;
}): Omit<EmailMessage, "to"> {
  const html = layout(
    "Your password changed",
    paragraph(`Hi ${escapeHtml(input.displayName)},`) +
      paragraph(
        "The password on your CTR Sports fan zone account was just changed, and every other session was signed out.",
      ) +
      paragraph("If this wasn't you, contact CTR Sports support immediately."),
    "This is a security notification.",
  );
  return {
    subject: "Your CTR Sports password changed",
    html,
    text: `Hi ${input.displayName},\n\nThe password on your CTR Sports fan zone account was just changed and every other session was signed out.\n\nIf this wasn't you, contact CTR Sports support immediately.`,
  };
}
