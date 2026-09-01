import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { peekInvitation } from "@/lib/member-invites";
import { ROLE_LABELS } from "@/lib/member-roles";
import { acceptInvitationAction } from "./actions";

export const metadata = { title: "Accept your invitation" };

const MESSAGES: Record<string, string> = {
  invalid: "Use at least 10 characters, and make both fields match.",
  "rate-limited": "Too many attempts. Wait a few minutes and try again.",
  expired: "That invitation has expired or was already used.",
  exists: "An account already exists for this address. Sign in instead.",
};

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status } = await searchParams;

  // Read-only — the invitation is consumed by the action, not this render.
  const invite = await peekInvitation(token);

  if (!invite) {
    return (
      <AuthCard title="Invitation expired">
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          {MESSAGES[status ?? "expired"] ?? MESSAGES.expired} Ask your team admin to send a new
          one.
        </p>
        <Link
          href="/m/login"
          className="chamfer-tr mt-5 inline-flex min-h-11 w-full items-center justify-center border border-line px-4 text-sm font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint"
        >
          Go to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Accept your invitation">
      <dl className="mt-4 space-y-1.5 border border-line bg-page p-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-fg-faint">Name</dt>
          <dd className="text-right font-bold text-fg">{invite.displayName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-fg-faint">Email</dt>
          <dd className="break-all text-right text-fg">{invite.email}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-fg-faint">Role</dt>
          <dd className="text-right font-bold text-fg">{ROLE_LABELS[invite.role]}</dd>
        </div>
        {invite.jobTitle ? (
          <div className="flex justify-between gap-3">
            <dt className="text-fg-faint">Position</dt>
            <dd className="text-right text-fg">{invite.jobTitle}</dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-4 text-sm leading-relaxed text-fg-muted">
        Choose a password to activate your account.
      </p>

      {status && MESSAGES[status] ? (
        <p className="mt-4 border border-f1-red/40 bg-f1-red/10 px-3 py-2 text-xs font-bold text-red-700">
          {MESSAGES[status]}
        </p>
      ) : null}

      <form action={acceptInvitationAction} className="mt-4 space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label="Password" hint="At least 10 characters.">
          <Input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            autoFocus
          />
        </Field>
        <Field label="Confirm password">
          <Input name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field>
        <SubmitButton className="w-full">Activate account</SubmitButton>
      </form>
    </AuthCard>
  );
}
