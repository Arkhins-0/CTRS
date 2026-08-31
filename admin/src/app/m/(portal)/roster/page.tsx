import { and, eq, isNull } from "drizzle-orm";
import { db, memberInvitations, members } from "@ctr/db";
import { requireTeamAdmin } from "@/lib/member-auth";
import { ROLE_HINTS, ROLE_LABELS, TEAM_ASSIGNABLE_ROLES } from "@/lib/member-roles";
import { Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { inviteMemberAction, revokeInviteAction, setMemberActiveAction } from "./actions";

export const metadata = { title: "Roster" };

const STATUS: Record<string, { tone: "ok" | "error"; message: string }> = {
  invited: { tone: "ok", message: "Invitation sent." },
  "invite-revoked": { tone: "ok", message: "Invitation withdrawn." },
  deactivated: { tone: "ok", message: "Member deactivated and signed out." },
  reactivated: { tone: "ok", message: "Member reactivated." },
  invalid: { tone: "error", message: "Check the name, email and role." },
  exists: { tone: "error", message: "That address already has an account." },
  "send-failed": { tone: "error", message: "Could not send the invitation email. Try again." },
  "rate-limited": { tone: "error", message: "Too many invitations. Try again later." },
  "not-found": { tone: "error", message: "That record is not on your roster." },
  self: { tone: "error", message: "You cannot deactivate your own account." },
};

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireTeamAdmin();
  const { status } = await searchParams;
  const banner = status ? STATUS[status] : undefined;
  const teamId = session.member.teamId!;

  const [roster, pending] = await Promise.all([
    db.query.members.findMany({
      where: eq(members.teamId, teamId),
      orderBy: members.displayName,
      columns: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        jobTitle: true,
        isActive: true,
        lastLoginAt: true,
      },
    }),
    db.query.memberInvitations.findMany({
      where: and(eq(memberInvitations.teamId, teamId), isNull(memberInvitations.acceptedAt)),
      orderBy: memberInvitations.createdAt,
      columns: {
        tokenHash: true,
        email: true,
        displayName: true,
        role: true,
        expiresAt: true,
      },
    }),
  ]);

  return (
    <>
      <PageHeader title="Roster" sub={session.team?.name ?? undefined} />

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
        {/* ── Invite ──────────────────────────────────────────────────── */}
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg">Invite someone</h2>
          <p className="mt-1 text-xs text-fg-muted">
            They&apos;ll get an email to set their own password. The link lasts 14 days and works
            once.
          </p>
          <form action={inviteMemberAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input name="displayName" required minLength={2} placeholder="Alex Menon" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required placeholder="alex@example.com" />
            </Field>
            <Field label="Role">
              <Select name="role" defaultValue="team_member">
                {TEAM_ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Position" hint="Optional — e.g. Chief Mechanic.">
              <Input name="jobTitle" maxLength={120} />
            </Field>
            <div className="sm:col-span-2">
              <SubmitButton>Send invitation</SubmitButton>
              <p className="mt-2 text-xs text-fg-faint">
                {ROLE_HINTS.team_admin}
              </p>
            </div>
          </form>
        </Card>

        {/* ── Pending invitations ─────────────────────────────────────── */}
        {pending.length ? (
          <Card>
            <h2 className="text-sm font-bold uppercase tracking-wide text-fg">
              Pending invitations
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {pending.map((inv) => (
                <li
                  key={inv.tokenHash}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-fg">{inv.displayName}</p>
                    <p className="truncate text-xs text-fg-muted">{inv.email}</p>
                    <p className="font-numeric text-[11px] text-fg-faint">
                      {ROLE_LABELS[inv.role]} · expires{" "}
                      {inv.expiresAt.toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="tokenHash" value={inv.tokenHash} />
                    <ConfirmSubmit message="Withdraw this invitation?">Withdraw</ConfirmSubmit>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {/* ── Members ─────────────────────────────────────────────────── */}
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg">
            Members ({roster.length})
          </h2>
          {roster.length ? (
            <ul className="mt-3 divide-y divide-line">
              {roster.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-fg">
                      {m.displayName}
                      {m.id === session.member.id ? (
                        <span className="ml-2 text-[11px] font-bold uppercase text-fg-faint">
                          you
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-fg-muted">{m.email}</p>
                    <p className="text-[11px] text-fg-faint">
                      {ROLE_LABELS[m.role]}
                      {m.jobTitle ? ` · ${m.jobTitle}` : ""}
                      {m.isActive ? "" : " · deactivated"}
                    </p>
                  </div>
                  {m.id === session.member.id ? null : (
                    <form action={setMemberActiveAction}>
                      <input type="hidden" name="memberId" value={m.id} />
                      <input type="hidden" name="active" value={m.isActive ? "false" : "true"} />
                      {m.isActive ? (
                        <ConfirmSubmit message="Deactivate this member? They'll be signed out of every device immediately.">
                          Deactivate
                        </ConfirmSubmit>
                      ) : (
                        <SubmitButton variant="secondary">Reactivate</SubmitButton>
                      )}
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No members yet" hint="Invite your crew with the form above." />
          )}
        </Card>
      </div>
    </>
  );
}
