import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/fanzone/auth-card";
import { Field, TextInput } from "@/components/fanzone/form";
import { SubmitButton } from "@/components/fanzone/submit-button";
import { requestFanPasswordResetAction } from "./actions";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset the password on your CTR fan zone account.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  if (status === "sent") {
    return (
      <AuthCard title="Check your inbox">
        <p className="body-s text-text-3">
          If that address has a CTR account, a reset link is on its way. It expires in an
          hour and can only be used once.
        </p>
        <p className="body-s mt-3 text-text-3">
          Nothing arrived? Check spam, then try again.
        </p>
        <Link href="/login" className="body-s mt-5 inline-block font-bold uppercase text-brand hover:underline">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="Enter your email and we'll send a link to set a new password."
      footer={
        <Link href="/login" className="font-bold uppercase text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form action={requestFanPasswordResetAction} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            autoFocus
          />
        </Field>
        <SubmitButton label="Send reset link" pendingLabel="Sending…" className="w-full" />
      </form>
    </AuthCard>
  );
}
