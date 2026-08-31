import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { SubmitButton } from "@/components/ui-client";
import { peekToken } from "@/lib/tokens";
import { confirmEmailChangeAction } from "./actions";

export const metadata = { title: "Confirm your new address" };

const MESSAGES: Record<string, string> = {
  expired: "That link has expired or was already used. Request the change again from Account.",
  taken: "That address now belongs to another admin account.",
};

export default async function ConfirmEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status } = await searchParams;

  const valid = await peekToken(token, "email_change");

  if (!valid) {
    return (
      <AuthCard title="Link expired">
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          {MESSAGES[status ?? "expired"] ?? MESSAGES.expired}
        </p>
        <Link
          href="/login"
          className="chamfer-tr mt-5 inline-flex min-h-11 w-full items-center justify-center border border-line px-4 text-sm font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint"
        >
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Confirm your new address">
      <p className="mt-2 mb-5 text-sm leading-relaxed text-fg-muted">
        Confirm this address as your new sign-in email. You&apos;ll be signed out everywhere and
        will need to sign in again with it.
      </p>

      {status && MESSAGES[status] ? (
        <p className="mb-4 border border-f1-red/40 bg-f1-red/10 px-3 py-2 text-xs font-bold text-red-300">
          {MESSAGES[status]}
        </p>
      ) : null}

      {/* The token is spent by this POST, never by the GET above. */}
      <form action={confirmEmailChangeAction}>
        <input type="hidden" name="token" value={token} />
        <SubmitButton className="w-full">Confirm new address</SubmitButton>
      </form>
    </AuthCard>
  );
}
