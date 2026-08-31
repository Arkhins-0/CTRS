import { asc } from "drizzle-orm";
import { db, rounds } from "@ctr/db";
import { requireMember } from "@/lib/member-auth";
import { Card, EmptyState, PageHeader, StatusPill } from "@/components/ui";

export const metadata = { title: "Schedule" };

export default async function MemberSchedulePage() {
  await requireMember();

  const today = new Date().toISOString().slice(0, 10);

  const all = await db.query.rounds.findMany({
    orderBy: asc(rounds.startDate),
    columns: {
      id: true,
      round: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true,
      hasSprint: true,
    },
    with: {
      circuit: { columns: { name: true, locality: true, country: true } },
      sessions: {
        columns: { id: true, label: true, type: true, startsAt: true, status: true },
      },
    },
  });

  // `date` columns come back as YYYY-MM-DD strings, so a plain compare is a
  // correct chronological test without any timezone conversion.
  const upcoming = all.filter((r) => !r.endDate || r.endDate >= today);
  const past = all.filter((r) => r.endDate && r.endDate < today).reverse();

  return (
    <>
      <PageHeader title="Schedule" sub="Race weekends and session timetables." />

      {all.length === 0 ? (
        <EmptyState title="No rounds scheduled" hint="The calendar hasn't been published yet." />
      ) : (
        <div className="grid gap-4">
          {upcoming.length ? (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-fg-faint">
                Upcoming
              </h2>
              <div className="grid gap-3">
                {upcoming.map((r) => (
                  <RoundCard key={r.id} round={r} />
                ))}
              </div>
            </section>
          ) : null}

          {past.length ? (
            <section>
              <h2 className="mb-2 mt-2 text-xs font-bold uppercase tracking-[0.2em] text-fg-faint">
                Completed
              </h2>
              <div className="grid gap-3">
                {past.slice(0, 10).map((r) => (
                  <RoundCard key={r.id} round={r} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}

type RoundRow = {
  round: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  circuit: { name: string; locality: string | null; country: string | null } | null;
  sessions: { id: string; label: string | null; type: string; startsAt: Date | null }[];
};

function RoundCard({ round }: { round: RoundRow }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-numeric text-[11px] uppercase tracking-wide text-fg-faint">
            Round {round.round}
          </p>
          <h3 className="text-base font-bold text-fg">{round.name}</h3>
          <p className="text-xs text-fg-muted">
            {round.circuit
              ? [round.circuit.name, round.circuit.locality, round.circuit.country]
                  .filter(Boolean)
                  .join(" · ")
              : "Venue TBC"}
          </p>
        </div>
        <StatusPill status={round.status} />
      </div>

      <p className="mt-2 font-numeric text-xs text-fg-faint">
        {round.startDate ?? "TBC"}
        {round.endDate && round.endDate !== round.startDate ? ` — ${round.endDate}` : ""}
      </p>

      {round.sessions.length ? (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {round.sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <span className="truncate text-sm text-fg">{s.label ?? s.type}</span>
              <span className="shrink-0 font-numeric text-xs text-fg-faint">
                {s.startsAt
                  ? s.startsAt.toISOString().slice(5, 16).replace("T", " ")
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
