import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { requestPasswordResetAction } from "./actions";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  if (status === "sent") {
    return (
      <AuthCard title="Check your inbox">
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          If that address belongs to an admin account, a reset link is on its way. It expires in an
          hour and can only be used once.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Nothing arrived? Check spam, then try again — or ask a Super Admin to reset it for you.
        </p>
        <Link
          href="/login"
          className="chamfer-tr mt-5 inline-flex min-h-11 items-center justify-center border border-line px-4 text-sm font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint"
        >
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password"
      footer={<Link href="/login" className="hover:text-fg">Back to sign in</Link>}
    >
      <p className="mt-2 mb-5 text-sm leading-relaxed text-fg-muted">
        Enter your admin email and we&apos;ll send a link to set a new password.
      </p>
      <form action={requestPasswordResetAction} className="space-y-4">
        <Field label="Email">
          <Input
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            placeholder="you@ctrsports.in"
          />
        </Field>
        <SubmitButton className="w-full">Send reset link</SubmitButton>
      </form>
    </AuthCard>
  );
}
