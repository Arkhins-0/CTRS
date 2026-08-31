import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { peekToken } from "@/lib/tokens";
import { resetPasswordAction } from "./actions";

export const metadata = { title: "Set a new password" };

const MESSAGES: Record<string, string> = {
  invalid: "Use at least 10 characters, and make both fields match.",
  "rate-limited": "Too many attempts. Wait a few minutes and try again.",
  expired: "That link has expired or was already used. Request a new one.",
};

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status } = await searchParams;

  // Read-only check — the token is consumed by the action, not by this render.
  const valid = await peekToken(token, "password_reset");

  if (!valid) {
    return (
      <AuthCard title="Link expired">
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Password reset links last one hour and work once. This one has expired, was already
          used, or never existed.
        </p>
        <Link
          href="/forgot-password"
          className="chamfer-tr mt-5 inline-flex min-h-11 w-full items-center justify-center bg-accent px-4 text-sm font-bold uppercase tracking-wide text-accent-fg transition-colors hover:bg-accent-dark"
        >
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      footer={<Link href="/login" className="hover:text-fg">Back to sign in</Link>}
    >
      <p className="mt-2 mb-5 text-sm leading-relaxed text-fg-muted">
        Choose a new password. Every device currently signed in to this account will be signed out.
      </p>

      {status && MESSAGES[status] ? (
        <p className="mb-4 border border-f1-red/40 bg-f1-red/10 px-3 py-2 text-xs font-bold text-red-300">
          {MESSAGES[status]}
        </p>
      ) : null}

      <form action={resetPasswordAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label="New password" hint="At least 10 characters.">
          <Input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            autoFocus
          />
        </Field>
        <Field label="Confirm new password">
          <Input name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field>
        <SubmitButton className="w-full">Set password</SubmitButton>
      </form>
    </AuthCard>
  );
}
