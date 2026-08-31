export { sendEmail, resolveEmailProvider } from "./client";
export type { EmailMessage, EmailProvider, SendOutcome } from "./client";
export {
  escapeHtml,
  newsletterConfirmEmail,
  roundReminderEmail,
  rsvpConfirmationEmail,
} from "./templates";
export { buildIcs, type IcsEvent } from "./ics";
