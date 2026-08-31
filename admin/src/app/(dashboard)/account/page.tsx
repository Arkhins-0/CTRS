import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { NotificationsToggle } from "@/components/notifications-toggle";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  getNotificationPrefs,
} from "@/lib/notification-prefs";
import {
  changePasswordAction,
  requestEmailChangeAction,
  updateNotificationPrefsAction,
  updateProfileAction,
} from "./actions";

export const metadata: Metadata = { title: "Account" };

const STATUS: Record<string, { tone: "ok" | "error"; message: string }> = {
  "profile-saved": { tone: "ok", message: "Profile updated." },
  "password-saved": { tone: "ok", message: "Password changed — other devices were signed out." },
  "prefs-saved": { tone: "ok", message: "Notification preferences saved." },
  "email-change-sent": {
    tone: "ok",
    message: "Check the new address for a confirmation link. Your current address keeps working until you confirm.",
  },
  "invalid-name": { tone: "error", message: "Enter a name of at least 2 characters." },
  "invalid-password": { tone: "error", message: "Use at least 10 characters, and make both fields match." },
  "wrong-password": { tone: "error", message: "That password was incorrect." },
  "invalid-email": { tone: "error", message: "Enter a valid email address." },
  "same-email": { tone: "error", message: "That is already your sign-in address." },
  "email-send-failed": { tone: "error", message: "Could not send the confirmation email. Try again." },
  "rate-limited": { tone: "error", message: "Too many attempts. Wait a few minutes and try again." },
};

function Banner({ status }: { status?: string }) {
  const entry = status ? STATUS[status] : undefined;
  if (!entry) return null;
  return (
    <p
      role="status"
      className={`mb-5 border px-3 py-2 text-xs font-bold ${
        entry.tone === "ok"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-f1-red/40 bg-f1-red/10 text-red-300"
      }`}
    >
      {entry.message}
    </p>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 border-b border-line py-3 last:border-0">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-5 shrink-0 accent-accent"
      />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-fg">{label}</span>
        <span className="block text-xs text-fg-muted">{hint}</span>
      </span>
    </label>
  );
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireAdmin();
  const { status } = await searchParams;
  const prefs = await getNotificationPrefs(session.user.id);

  return (
    <>
      <PageHeader title="Account" sub="Your profile, sign-in details and notifications." />
      <Banner status={status} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* ── Profile ─────────────────────────────────────────────────── */}
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg">Profile</h2>
          <form action={updateProfileAction} className="mt-4 space-y-4">
            <Field label="Display name">
              <Input name="displayName" defaultValue={session.user.displayName} required minLength={2} />
            </Field>
            <SubmitButton>Save profile</SubmitButton>
          </form>

          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-fg-faint">Roles</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {session.roles.length ? (
                session.roles.map((role) => (
                  <span
                    key={role}
                    className="border border-line px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-fg-muted"
                  >
                    {role.replace(/_/g, " ")}
                  </span>
                ))
              ) : (
                <span className="text-sm text-fg-faint">No roles assigned</span>
              )}
            </div>
            <p className="mt-2 text-xs text-fg-faint">
              Roles are managed by a Super Admin under Admin Users.
            </p>
          </div>
        </Card>

        {/* ── Notifications ───────────────────────────────────────────── */}
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg">Notifications</h2>
          <form action={updateNotificationPrefsAction} className="mt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-fg-faint">What to send</p>
            <div className="mt-1">
              {NOTIFICATION_CATEGORIES.map((c) => (
                <Toggle
                  key={c.key}
                  name={c.key}
                  label={c.label}
                  hint={c.hint}
                  defaultChecked={prefs[c.key]}
                />
              ))}
            </div>

            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-fg-faint">How to send it</p>
            <div className="mt-1">
              {NOTIFICATION_CHANNELS.map((c) => (
                <Toggle
                  key={c.key}
                  name={c.key}
                  label={c.label}
                  hint={c.hint}
                  defaultChecked={prefs[c.key]}
                />
              ))}
            </div>

            <SubmitButton className="mt-4">Save preferences</SubmitButton>
          </form>

          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-fg-faint">This device</p>
            <p className="mt-1 mb-3 text-xs text-fg-muted">
              Push is granted per device — enable it on each phone or computer you want alerts on.
            </p>
            <NotificationsToggle />
          </div>
        </Card>

        {/* ── Password ────────────────────────────────────────────────── */}
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg">Change password</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Changing your password signs out every other device.
          </p>
          <form action={changePasswordAction} className="mt-4 space-y-4">
            <Field label="Current password">
              <Input name="currentPassword" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="New password" hint="At least 10 characters.">
              <Input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
              />
            </Field>
            <Field label="Confirm new password">
              <Input name="confirmPassword" type="password" autoComplete="new-password" required />
            </Field>
            <SubmitButton>Change password</SubmitButton>
          </form>
        </Card>

        {/* ── Email ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-sm font-bold uppercase tracking-wide text-fg">Sign-in email</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Currently <span className="break-all font-bold text-fg">{session.user.email}</span>.
              We&apos;ll email the new address to confirm the change — the current one keeps working
              until you do.
            </p>
            <form action={requestEmailChangeAction} className="mt-4 space-y-4">
              <Field label="New email">
                <Input name="newEmail" type="email" autoComplete="email" required />
              </Field>
              <Field label="Confirm with your password">
                <Input name="password" type="password" autoComplete="current-password" required />
              </Field>
              <SubmitButton variant="secondary">Send confirmation</SubmitButton>
            </form>
          </Card>

          <InstallPrompt />
        </div>
      </div>
    </>
  );
}
