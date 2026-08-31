import { asc, eq } from "drizzle-orm";
import { MapPin } from "lucide-react";
import { db, memberRoundRsvps, rounds } from "@ctr/db";
import { requireMember } from "@/lib/member-auth";
import { Card, EmptyState, PageHeader, StatusPill } from "@/components/ui";
import { RsvpButtons } from "@/components/member/rsvp-buttons";

export const metadata = { title: "Schedule" };

const STATUS: Record<string, { tone: "ok" | "error"; message: string }> = {
  saved: { tone: "ok", message: "Availability saved." },
  invalid: { tone: "error", message: "Could not save that — try again." },
};

export default async function MemberSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireMember();
  const { status } = await searchParams;
  const banner = status ? STATUS[status] : undefined;

  const today = new Date().toISOString().slice(0, 10);

  const [all, myRsvps] = await Promise.all([
    db.query.rounds.findMany({
      orderBy: asc(rounds.startDate),
      columns: {
        id: true,
        round: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      with: {
        circuit: {
          columns: {
            name: true,
            locality: true,
            country: true,
            lengthKm: true,
            turns: true,
            raceLaps: true,
          },
        },
        sessions: { columns: { id: true, label: true, type: true, startsAt: true } },
      },
    }),
    db.query.memberRoundRsvps.findMany({
      where: eq(memberRoundRsvps.memberId, session.member.id),
      columns: { roundId: true, status: true },
    }),
  ]);

  const rsvpByRound = new Map(myRsvps.map((r) => [r.roundId, r.status]));

  // `date` columns come back as YYYY-MM-DD strings, so a plain string compare
  // is a correct chronological test with no timezone conversion.
  const upcoming = all.filter((r) => !r.endDate || r.endDate >= today);
  const past = all.filter((r) => r.endDate && r.endDate < today).reverse();

  return (
    <>
      <PageHeader title="Schedule" sub="Race weekends, timetables and your availability." />

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
                  <RoundCard key={r.id} round={r} rsvp={rsvpByRound.get(r.id) ?? null} askRsvp />
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
                  <RoundCard key={r.id} round={r} rsvp={rsvpByRound.get(r.id) ?? null} />
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
  id: string;
  round: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  circuit: {
    name: string;
    locality: string | null;
    country: string | null;
    lengthKm: number | null;
    turns: number | null;
    raceLaps: number | null;
  } | null;
  sessions: { id: string; label: string | null; type: string; startsAt: Date | null }[];
};

function RoundCard({
  round,
  rsvp,
  askRsvp = false,
}: {
  round: RoundRow;
  rsvp: "going" | "maybe" | "not_going" | null;
  askRsvp?: boolean;
}) {
  const venue = round.circuit;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-numeric text-[11px] uppercase tracking-wide text-fg-faint">
            Round {round.round}
          </p>
          <h3 className="text-base font-bold text-fg">{round.name}</h3>
        </div>
        <StatusPill status={round.status} />
      </div>

      {venue ? (
        <div className="mt-2 border-l-2 border-line pl-2.5">
          <p className="flex items-center gap-1.5 text-sm font-bold text-fg">
            <MapPin size={13} className="shrink-0 text-fg-faint" />
            {venue.name}
          </p>
          <p className="text-xs text-fg-muted">
            {[venue.locality, venue.country].filter(Boolean).join(", ")}
          </p>
          <p className="mt-0.5 font-numeric text-[11px] text-fg-faint">
            {[
              venue.lengthKm ? `${venue.lengthKm} km` : null,
              venue.turns ? `${venue.turns} turns` : null,
              venue.raceLaps ? `${venue.raceLaps} laps` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-fg-faint">Venue TBC</p>
      )}

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
                {s.startsAt ? s.startsAt.toISOString().slice(5, 16).replace("T", " ") : "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {askRsvp ? (
        <>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-fg-faint">
            Will you be there?
          </p>
          <RsvpButtons roundId={round.id} current={rsvp} />
        </>
      ) : null}
    </Card>
  );
}
