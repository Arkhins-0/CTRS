import Link from "next/link";
import { asc, isNull } from "drizzle-orm";
import { Download } from "lucide-react";
import { PERMISSIONS, db, memberInvitations, members, teams } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { ADMIN_ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/member-roles";
import { Card, EmptyState, Field, Input, PageHeader, Select, Table } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import {
  adminInviteMemberAction,
  adminRevokeInviteAction,
  adminSetMemberActiveAction,
} from "./actions";

export const metadata = { title: "Members" };

const STATUS: Record<string, { tone: "ok" | "error"; message: string }> = {
  invited: { tone: "ok", message: "Invitation sent." },
  "invite-revoked": { tone: "ok", message: "Invitation withdrawn." },
  deactivated: { tone: "ok", message: "Member deactivated and signed out." },
  reactivated: { tone: "ok", message: "Member reactivated." },
  "password-reset": { tone: "ok", message: "Password reset — the member was signed out and notified by email." },
  invalid: { tone: "error", message: "Check the details — team roles need a team." },
  exists: { tone: "error", message: "That address already has an account." },
  "send-failed": { tone: "error", message: "Could not send the invitation email." },
  "not-found": { tone: "error", message: "That record no longer exists." },
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requirePermission(PERMISSIONS.MEMBERS_MANAGE);
  const canResetPassword = session.permissions.has(PERMISSIONS.ADMINS_MANAGE);
  const { status } = await searchParams;
  const banner = status ? STATUS[status] : undefined;

  const [roster, pending, teamList] = await Promise.all([
    db.query.members.findMany({
      orderBy: asc(members.displayName),
      columns: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        jobTitle: true,
        isActive: true,
        lastLoginAt: true,
      },
      with: { team: { columns: { name: true } } },
    }),
    db.query.memberInvitations.findMany({
      where: isNull(memberInvitations.acceptedAt),
      orderBy: asc(memberInvitations.createdAt),
      columns: { tokenHash: true, email: true, displayName: true, role: true, expiresAt: true },
      with: { team: { columns: { name: true } } },
    }),
    db.query.teams.findMany({ orderBy: asc(teams.name), columns: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Members"
        sub="Team crew, drivers and officials who sign in to the member area."
        actions={
          <a
            href="/api/export/members"
            className="chamfer-tr inline-flex min-h-11 items-center gap-2 border border-line px-4 text-sm font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint"
          >
            <Download size={15} /> Export CSV
          </a>
        }
      />

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
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg">Invite a member</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Team managers invite their own crew. Use this for officials, or to seed a team&apos;s
            first team manager.
          </p>
          <form action={adminInviteMemberAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input name="displayName" required minLength={2} />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required />
            </Field>
            <Field label="Role">
              <Select name="role" defaultValue="team_manager">
                {ADMIN_ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Team" hint="Required unless the role is Official.">
              <Select name="teamId" defaultValue="">
                <option value="">— none (official) —</option>
                {teamList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Position" hint="Optional.">
              <Input name="jobTitle" maxLength={120} />
            </Field>
            <div className="flex items-end">
              <SubmitButton>Send invitation</SubmitButton>
            </div>
          </form>
        </Card>

        {pending.length ? (
          <Card>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-fg">
              Pending invitations ({pending.length})
            </h2>
            <Table
              head={
                <>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Expires</th>
                  <th />
                </>
              }
            >
              {pending.map((inv) => (
                <tr key={inv.tokenHash}>
                  <td className="font-bold text-fg">{inv.displayName}</td>
                  <td className="text-fg-muted">{inv.email}</td>
                  <td>{ROLE_LABELS[inv.role]}</td>
                  <td className="text-fg-muted">{inv.team?.name ?? "—"}</td>
                  <td className="font-numeric text-fg-faint">
                    {inv.expiresAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="text-right">
                    <form action={adminRevokeInviteAction}>
                      <input type="hidden" name="tokenHash" value={inv.tokenHash} />
                      <ConfirmSubmit message="Withdraw this invitation?">Withdraw</ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        ) : null}

        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-fg">
            All members ({roster.length})
          </h2>
          {roster.length ? (
            <Table
              head={
                <>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Last seen</th>
                  <th />
                </>
              }
            >
              {roster.map((m) => (
                <tr key={m.id} className={m.isActive ? "" : "opacity-60"}>
                  <td>
                    <span className="font-bold text-fg">{m.displayName}</span>
                    {m.jobTitle ? (
                      <span className="block text-[11px] text-fg-faint">{m.jobTitle}</span>
                    ) : null}
                  </td>
                  <td className="text-fg-muted">{m.email}</td>
                  <td>{ROLE_LABELS[m.role]}</td>
                  <td className="text-fg-muted">{m.team?.name ?? "—"}</td>
                  <td className="font-numeric text-fg-faint">
                    {m.lastLoginAt ? m.lastLoginAt.toISOString().slice(0, 10) : "never"}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canResetPassword ? (
                        <Link
                          href={`/members/${m.id}/reset-password`}
                          className="text-xs font-bold uppercase text-fg-faint hover:text-fg"
                        >
                          Reset password
                        </Link>
                      ) : null}
                      <form action={adminSetMemberActiveAction}>
                        <input type="hidden" name="memberId" value={m.id} />
                        <input type="hidden" name="active" value={m.isActive ? "false" : "true"} />
                        {m.isActive ? (
                          <ConfirmSubmit message="Deactivate this member? They'll be signed out everywhere immediately.">
                            Deactivate
                          </ConfirmSubmit>
                        ) : (
                          <SubmitButton variant="secondary">Reactivate</SubmitButton>
                        )}
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState
              title="No members yet"
              hint="Invite a team admin above — they can then build out their own roster."
            />
          )}
        </Card>
      </div>
    </>
  );
}
