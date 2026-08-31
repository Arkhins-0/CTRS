export { sendEmail, resolveEmailProvider } from "./client";
export type { EmailMessage, EmailProvider, SendOutcome } from "./client";
export {
  adminEmailChangedNoticeEmail,
  adminEmailChangeEmail,
  adminPasswordChangedNoticeEmail,
  adminPasswordResetEmail,
  escapeHtml,
  fanPasswordChangedNoticeEmail,
  fanPasswordResetEmail,
  memberInviteEmail,
  memberPasswordChangedNoticeEmail,
  memberPasswordResetEmail,
  newsletterConfirmEmail,
  roundReminderEmail,
  rsvpConfirmationEmail,
} from "./templates";
export { buildIcs, type IcsEvent } from "./ics";
export {
  emailifyBodyHtml,
  newsletterBroadcastEmail,
  newsletterDigestEmail,
  type NewsletterBroadcastInput,
  type NewsletterDigestInput,
  type NewsCard,
  type SponsorLogo,
  type StandingRow,
} from "./newsletter";
export { type SocialLink } from "./brand";
