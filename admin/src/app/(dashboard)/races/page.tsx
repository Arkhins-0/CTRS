import Link from "next/link";
import { eq, inArray, sql } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import { Badge } from "@ctr/ui";
import { db, roundRsvps, rounds, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, LinkButton, PageHeader, StatusPill, Table } from "@/components/ui";
import { loadSeasonTabs, pickSeason, SeasonTabs } from "@/components/racing/season-tabs";

export const dynamic = "force-dynamic";

const fmtDate = (d: string | null) => (d ? format(parseISO(d), "d MMM") : "—");

export default async function RacesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  await requirePermission(PERMISSIONS.RACES_MANAGE);
  const sp = await searchParams;

  const seasons = await loadSeasonTabs();
  const season = pickSeason(seasons, sp.season);
  if (!season) {
    return (
      <>
        <PageHeader title="Race Weekends" sub="Season calendar & session timetables" />
        <EmptyState
          title="No championship seasons yet"
          hint="Create a championship season before adding race weekends."
        />
      </>
    );
  }

  const roundRows = await db.query.rounds.findMany({
    where: eq(rounds.championshipSeasonId, season.id),
    orderBy: (t, { asc }) => [asc(t.round)],
    with: {
      circuit: { columns: { name: true, country: true } },
      sessions: { columns: { id: true } },
    },
  });

  // fan attendance per round: "12 going · 3 maybe"
  const rsvpRows = roundRows.length
    ? await db
        .select({
          roundId: roundRsvps.roundId,
          status: roundRsvps.status,
          n: sql<number>`count(*)::int`,
        })
        .from(roundRsvps)
        .where(inArray(roundRsvps.roundId, roundRows.map((r) => r.id)))
        .groupBy(roundRsvps.roundId, roundRsvps.status)
    : [];
  const rsvpByRound = new Map<string, { going: number; maybe: number }>();
  for (const row of rsvpRows) {
    const entry = rsvpByRound.get(row.roundId) ?? { going: 0, maybe: 0 };
    if (row.status === "going") entry.going = row.n;
    if (row.status === "maybe") entry.maybe = row.n;
    rsvpByRound.set(row.roundId, entry);
  }

  return (
    <>
      <PageHeader
        title="Race Weekends"
        sub={`${roundRows.length} round${roundRows.length === 1 ? "" : "s"} in ${season.label}`}
        actions={<LinkButton href={`/races/new?season=${season.id}`}>New race weekend</LinkButton>}
      />

      <SeasonTabs seasons={seasons} activeId={season.id} base="/races" />

      {roundRows.length ? (
        <Table
          head={
            <>
              <th className="w-12">Rd</th>
              <th>Round</th>
              <th>Circuit</th>
              <th>Dates</th>
              <th>Format</th>
              <th>Status</th>
              <th className="w-20 text-right">Sessions</th>
              <th className="w-32 text-right">RSVPs</th>
              <th className="w-16" />
            </>
          }
        >
          {roundRows.map((r) => (
            <tr key={r.id}>
              <td className="font-black">{r.round}</td>
              <td>
                <Link href={`/races/${r.id}`} className="font-bold hover:text-f1-red">
                  {r.name}
                </Link>
              </td>
              <td className="text-f1-grey">
                {r.circuit.name}
                <span className="text-f1-grey-light"> · {r.circuit.country}</span>
              </td>
              <td className="whitespace-nowrap">
                {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
              </td>
              <td>{r.hasSprint ? <Badge tone="red">Sprint</Badge> : <span className="text-f1-grey-light">—</span>}</td>
              <td>
                <StatusPill status={r.status} />
              </td>
              <td className="text-right font-bold">{r.sessions.length}</td>
              <td className="whitespace-nowrap text-right">
                {(() => {
                  const c = rsvpByRound.get(r.id);
                  return c && (c.going || c.maybe) ? (
                    <>
                      <span className="font-bold">{c.going}</span>
                      <span className="text-f1-grey"> going</span>
                      {c.maybe ? (
                        <span className="text-f1-grey"> · {c.maybe} maybe</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-f1-grey-light">—</span>
                  );
                })()}
              </td>
              <td className="text-right">
                <Link
                  href={`/races/${r.id}`}
                  className="text-xs font-bold uppercase text-f1-red hover:underline"
                >
                  Edit →
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState
          title={`No race weekends in ${season.label}`}
          hint="Create the first round with “New race weekend”."
        />
      )}
    </>
  );
}
