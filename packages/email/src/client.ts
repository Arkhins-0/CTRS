/**
 * Provider-agnostic email seam, adapted from OpenLeague/Spartan's
 * lib/email/client.ts (Apache-2.0 — see NOTICE). Two providers:
 *
 *  - "brevo": Brevo's transactional HTTP API (free tier: 300 emails/day,
 *    unlimited contacts). No SDK — a single fetch call.
 *  - "log":   dev fallback — prints the email to the console. In production
 *    it THROWS at send time so misconfiguration fails loudly, never silently.
 *
 * Selection: EMAIL_PROVIDER env wins; otherwise "brevo" when BREVO_API_KEY is
 * set; otherwise "log". Multi-recipient sends go out as one call per
 * recipient so no subscriber ever sees another's address.
 */

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
};

export type EmailProvider = "brevo" | "log";

export type SendOutcome = {
  /** false only in "log" mode — callers may surface dev fallbacks (e.g. an on-screen confirm link) */
  delivered: boolean;
};

export function resolveEmailProvider(): EmailProvider {
  const explicit = process.env.EMAIL_PROVIDER;
  if (explicit === "brevo" || explicit === "log") return explicit;
  if (process.env.BREVO_API_KEY) return "brevo";
  return "log";
}

function fromAddress(): { email: string; name: string } {
  return {
    email: process.env.EMAIL_FROM ?? "noreply@localhost",
    name: process.env.EMAIL_FROM_NAME ?? "CTR Sports",
  };
}

async function sendViaBrevo(to: string, message: EmailMessage): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY ?? "",
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: fromAddress(),
      to: [{ email: to }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
    }),
  });
  if (!res.ok) {
    // Brevo returns a JSON error body — include it so failures are debuggable.
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo send failed (${res.status}): ${body.slice(0, 300)}`);
  }
}

export async function sendEmail(message: EmailMessage): Promise<SendOutcome> {
  const provider = resolveEmailProvider();
  const recipients = Array.isArray(message.to) ? message.to : [message.to];
  if (!recipients.length) return { delivered: false };

  if (provider === "log") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "No email provider configured (set BREVO_API_KEY or EMAIL_PROVIDER) — refusing to drop email silently in production.",
      );
    }
    console.info(
      `[email:log] to=${recipients.join(", ")} subject="${message.subject}"\n${message.text}`,
    );
    return { delivered: false };
  }

  // one call per recipient — never leak the recipient list
  for (const to of recipients) {
    await sendViaBrevo(to, message);
  }
  return { delivered: true };
}
