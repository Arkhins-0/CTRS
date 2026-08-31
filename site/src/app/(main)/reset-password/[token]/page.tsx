import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/fanzone/auth-card";
import { Field, FormError, TextInput } from "@/components/fanzone/form";
import { SubmitButton } from "@/components/fanzone/submit-button";
import { peekFanResetToken } from "@/lib/fan-tokens";
import { resetFanPasswordAction } from "./actions";

export const metadata: Metadata = { title: "Set a new password" };

const MESSAGES: Record<string, string> = {
  invalid: "Use at least 8 characters, and make both fields match.",
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

  const valid = await peekFanResetToken(token);

  if (!valid) {
    return (
      <AuthCard title="Link expired">
        <p className="body-s text-text-3">
          Password reset links last one hour and work once. This one has expired, was already
          used, or never existed.
        </p>
        <Link href="/forgot-password" className="btn btn-md btn-brand mt-5 w-full">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Every device currently signed in to this account will be signed out."
      footer={
        <Link href="/login" className="font-bold uppercase text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form action={resetFanPasswordAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        {status && MESSAGES[status] ? <FormError>{MESSAGES[status]}</FormError> : null}
        <Field label="New password" htmlFor="newPassword" hint="At least 8 characters.">
          <TextInput
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            autoFocus
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword">
          <TextInput
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
        <SubmitButton label="Set password" pendingLabel="Saving…" className="w-full" />
      </form>
    </AuthCard>
  );
}
