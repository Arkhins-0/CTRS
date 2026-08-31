import { eq } from "drizzle-orm";
import { db, memberNotificationPrefs, members } from "@ctr/db";
import { requireMember } from "@/lib/member-auth";
import { ROLE_LABELS } from "@/lib/member-roles";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { MemberNotificationsToggle } from "@/components/member/notifications-toggle";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import {
  changeMemberPasswordAction,
  updateMemberPrefsAction,
  updateMemberProfileAction,
} from "./actions";

export const metadata = { title: "Account" };

const STATUS: Record<string, { tone: "ok" | "error"; message: string }> = {
  "profile-saved": { tone: "ok", message: "Profile updated." },
  "password-saved": { tone: "ok", message: "Password changed — other devices were signed out." },
  "prefs-saved": { tone: "ok", message: "Notification preferences saved." },
  "invalid-profile": { tone: "error", message: "Check your name and contact details." },
  "invalid-password": {
    tone: "error",
    message: "Use at least 10 characters, and make both fields match.",
  },
  "wrong-password": { tone: "error", message: "That password was incorrect." },
  "rate-limited": { tone: "error", message: "Too many attempts. Try again in a few minutes." },
};

const CATEGORIES = [
  { key: "announcements", label: "Announcements", hint: "Broadcasts from race control." },
  { key: "raceOps", label: "Race operations", hint: "Schedule and session changes." },
  { key: "rsvpReminders", label: "Availability reminders", hint: "Nudges to confirm attendance." },
] as const;

const CHANNELS = [
  { key: "pushEnabled", label: "Push", hint: "Alerts on devices you've enabled." },
  { key: "emailEnabled", label: "Email", hint: "Sent to your sign-in address." },
] as const;

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

export default async function MemberAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireMember();
  const { status } = await searchParams;
  const banner = status ? STATUS[status] : undefined;

  const [profile, prefsRow] = await Promise.all([
    db.query.members.findFirst({
      where: eq(members.id, session.member.id),
      columns: { displayName: true, email: true, phone: true, jobTitle: true },
    }),
    db.query.memberNotificationPrefs.findFirst({
      where: eq(memberNotificationPrefs.memberId, session.member.id),
    }),
  ]);

  // A missing row means the member has never opened these settings, which
  // resolves to everything on.
  const prefs = {
    announcements: prefsRow?.announcements ?? true,
    raceOps: prefsRow?.raceOps ?? true,
    rsvpReminders: prefsRow?.rsvpReminders ?? true,
    emailEnabled: prefsRow?.emailEnabled ?? true,
    pushEnabled: prefsRow?.pushEnabled ?? true,
  };

  return (
    <>
      <PageHeader title="Account" sub={ROLE_LABELS[session.member.role]} />

      {banner ? (
        <p
          role="status"
          className={`mb-5 border px-3 py-2 text-xs font-bold ${
            banner.tone === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-f1-red/40 bg-f1-red/10 text-red-300"
          }`}
        >
          {banner.message}
        </p>
      ) : null}

      <div className="grid gap-4">
        <InstallPrompt />

        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg">Your details</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Signed in as <span className="break-all font-bold text-fg">{profile?.email}</span>
            {session.team ? ` · ${session.team.name}` : ""}. Your role and team are set by your
            team admin.
          </p>
          <form action={updateMemberProfileAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input name="displayName" defaultValue={profile?.displayName ?? ""} required minLength={2} />
            </Field>
            <Field label="Phone" hint="Optional — used for race-day contact.">
              <Input name="phone" type="tel" defaultValue={profile?.phone ?? ""} maxLength={40} />
            </Field>
            <Field label="Position" hint="Optional — e.g. Chief Mechanic.">
              <Input name="jobTitle" defaultValue={profile?.jobTitle ?? ""} maxLength={120} />
            </Field>
            <div className="sm:col-span-2">
              <SubmitButton>Save details</SubmitButton>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg">Notifications</h2>
          <form action={updateMemberPrefsAction} className="mt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-fg-faint">What to send</p>
            <div className="mt-1">
              {CATEGORIES.map((c) => (
                <Toggle key={c.key} name={c.key} label={c.label} hint={c.hint} defaultChecked={prefs[c.key]} />
              ))}
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-fg-faint">
              How to send it
            </p>
            <div className="mt-1">
              {CHANNELS.map((c) => (
                <Toggle key={c.key} name={c.key} label={c.label} hint={c.hint} defaultChecked={prefs[c.key]} />
              ))}
            </div>
            <SubmitButton className="mt-4">Save preferences</SubmitButton>
          </form>

          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-fg-faint">This device</p>
            <p className="mt-1 mb-3 text-xs text-fg-muted">
              Push is granted per device — enable it on each phone you carry at a circuit.
            </p>
            <MemberNotificationsToggle />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg">Change password</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Changing your password signs out every other device.
          </p>
          <form action={changeMemberPasswordAction} className="mt-4 space-y-4">
            <Field label="Current password">
              <Input name="currentPassword" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="New password" hint="At least 10 characters.">
              <Input name="newPassword" type="password" autoComplete="new-password" minLength={10} required />
            </Field>
            <Field label="Confirm new password">
              <Input name="confirmPassword" type="password" autoComplete="new-password" required />
            </Field>
            <SubmitButton>Change password</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
