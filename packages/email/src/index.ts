export { sendEmail, resolveEmailProvider } from "./client";
export type { EmailMessage, EmailProvider, SendOutcome } from "./client";
export {
  adminEmailChangedNoticeEmail,
  adminEmailChangeEmail,
  adminPasswordChangedNoticeEmail,
  adminPasswordResetEmail,
  escapeHtml,
  memberInviteEmail,
  newsletterConfirmEmail,
  roundReminderEmail,
  rsvpConfirmationEmail,
} from "./templates";
export { buildIcs, type IcsEvent } from "./ics";
