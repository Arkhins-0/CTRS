import { and, asc, eq, gte, inArray, isNull } from "drizzle-orm";
import { db, memberInvitations, memberRoundRsvps, members, rounds } from "@ctr/db";
import { requireTeamAdmin } from "@/lib/member-auth";
import { ROLE_HINTS, ROLE_LABELS, TEAM_ASSIGNABLE_ROLES } from "@/lib/member-roles";
import { Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { inviteMemberAction, revokeInviteAction, setMemberActiveAction } from "./actions";

const RSVP_LABELS: Record<string, string> = {
  going: "Going",
  maybe: "Maybe",
  not_going: "Can't make it",
};

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

  /*
   * Attendance for the next few rounds. Answers are fetched for this team's
   * members only — a team admin must never see another team's availability.
   */
  const today = new Date().toISOString().slice(0, 10);
  const nextRounds = await db.query.rounds.findMany({
    where: gte(rounds.startDate, today),
    orderBy: asc(rounds.startDate),
    limit: 3,
    columns: { id: true, round: true, name: true, startDate: true },
  });

  const memberIds = roster.map((m) => m.id);
  const answers =
    nextRounds.length && memberIds.length
      ? await db.query.memberRoundRsvps.findMany({
          where: and(
            inArray(memberRoundRsvps.memberId, memberIds),
            inArray(
              memberRoundRsvps.roundId,
              nextRounds.map((r) => r.id),
            ),
          ),
          columns: { memberId: true, roundId: true, status: true, note: true },
        })
      : [];

  const nameById = new Map(roster.map((m) => [m.id, m.displayName]));

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

        {/* ── Attendance ──────────────────────────────────────────────── */}
        {nextRounds.length ? (
          <Card>
            <h2 className="text-sm font-bold uppercase tracking-wide text-fg">
              Crew availability
            </h2>
            <p className="mt-1 text-xs text-fg-muted">
              Who has confirmed for the next race weekends. Members answer from their own
              Schedule.
            </p>
            <div className="mt-4 grid gap-4">
              {nextRounds.map((round) => {
                const forRound = answers.filter((a) => a.roundId === round.id);
                const byStatus = (s: string) => forRound.filter((a) => a.status === s);
                const answered = new Set(forRound.map((a) => a.memberId));
                const noReply = roster.filter((m) => !answered.has(m.id));

                return (
                  <div key={round.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-bold text-fg">
                        R{round.round} · {round.name}
                      </p>
                      <p className="font-numeric text-[11px] text-fg-faint">{round.startDate}</p>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 font-numeric text-xs">
                      <span className="text-emerald-300">{byStatus("going").length} going</span>
                      <span className="text-amber-300">{byStatus("maybe").length} maybe</span>
                      <span className="text-red-300">{byStatus("not_going").length} can&apos;t</span>
                      <span className="text-fg-faint">{noReply.length} no reply</span>
                    </div>

                    {forRound.length ? (
                      <ul className="mt-2 space-y-1">
                        {forRound.map((a) => (
                          <li key={a.memberId} className="flex flex-wrap gap-x-2 text-xs">
                            <span className="font-bold text-fg">{nameById.get(a.memberId)}</span>
                            <span className="text-fg-muted">{RSVP_LABELS[a.status]}</span>
                            {a.note ? (
                              <span className="text-fg-faint">— {a.note}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-fg-faint">Nobody has answered yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

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
