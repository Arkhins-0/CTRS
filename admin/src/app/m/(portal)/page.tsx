import Link from "next/link";
import { desc, eq, gte } from "drizzle-orm";
import { CalendarDays, Megaphone, Users } from "lucide-react";
import { announcements, db, rounds } from "@ctr/db";
import { requireMember } from "@/lib/member-auth";
import { Card, PageHeader } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/member-roles";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { MemberNotificationsToggle } from "@/components/member/notifications-toggle";

export const metadata = { title: "Home" };

export default async function MemberHome() {
  const session = await requireMember();

  const [nextRounds, latest] = await Promise.all([
    db.query.rounds.findMany({
      where: gte(rounds.startDate, new Date().toISOString().slice(0, 10)),
      orderBy: rounds.startDate,
      limit: 3,
      columns: { id: true, name: true, slug: true, startDate: true, endDate: true, status: true },
      with: { circuit: { columns: { name: true, locality: true, country: true } } },
    }),
    db.query.announcements.findMany({
      orderBy: desc(announcements.createdAt),
      limit: 3,
      columns: { id: true, title: true, body: true, sentAt: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={`Hi, ${session.member.displayName.split(" ")[0]}`}
        sub={`${ROLE_LABELS[session.member.role]}${session.team ? ` · ${session.team.name}` : ""}`}
      />

      <div className="grid gap-4">
        <InstallPrompt />

        <Card>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-fg">
            <CalendarDays size={15} /> Next race weekends
          </h2>
          {nextRounds.length ? (
            <ul className="mt-3 divide-y divide-line">
              {nextRounds.map((round) => (
                <li key={round.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-bold text-fg">{round.name}</p>
                  <p className="text-xs text-fg-muted">
                    {round.circuit
                      ? `${round.circuit.name} · ${round.circuit.locality ?? round.circuit.country ?? ""}`
                      : "Venue TBC"}
                  </p>
                  <p className="mt-0.5 font-numeric text-xs text-fg-faint">{round.startDate}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-fg-faint">Nothing scheduled yet.</p>
          )}
          <Link
            href="/m/schedule"
            className="mt-3 inline-block text-xs font-bold uppercase tracking-wide text-accent hover:underline"
          >
            Full schedule
          </Link>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-fg">
            <Megaphone size={15} /> Latest announcements
          </h2>
          {latest.length ? (
            <ul className="mt-3 divide-y divide-line">
              {latest.map((a) => (
                <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-bold text-fg">{a.title}</p>
                  <p className="line-clamp-2 text-xs text-fg-muted">{a.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-fg-faint">No announcements yet.</p>
          )}
          <Link
            href="/m/announcements"
            className="mt-3 inline-block text-xs font-bold uppercase tracking-wide text-accent hover:underline"
          >
            All announcements
          </Link>
        </Card>

        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg">
            Race-day notifications
          </h2>
          <p className="mt-1 mb-3 text-xs text-fg-muted">
            Turn these on for every device you carry at a circuit — announcements arrive instantly.
          </p>
          <MemberNotificationsToggle />
        </Card>

        {session.member.role === "team_admin" ? (
          <Card>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-fg">
              <Users size={15} /> Your roster
            </h2>
            <p className="mt-1 mb-3 text-xs text-fg-muted">
              Invite crew and drivers to {session.team?.name ?? "your team"} and manage who has
              access.
            </p>
            <Link
              href="/m/roster"
              className="chamfer-tr inline-flex min-h-11 items-center bg-accent px-4 text-sm font-bold uppercase tracking-wide text-accent-fg transition-colors hover:bg-accent-dark"
            >
              Manage roster
            </Link>
          </Card>
        ) : null}
      </div>
    </>
  );
}
