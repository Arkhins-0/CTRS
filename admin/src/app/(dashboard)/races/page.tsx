import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import { Badge } from "@ctr/ui";
import { db, grandsPrix, seasons, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, LinkButton, PageHeader, StatusPill, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

function SeasonTabs({ years, active }: { years: number[]; active: number }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b-2 border-carbon">
      {years.map((y) => (
        <Link
          key={y}
          href={`/races?year=${y}`}
          className={`px-4 py-2 text-sm font-black uppercase tracking-wide transition-colors ${
            y === active ? "chamfer-tr bg-carbon text-white" : "text-f1-grey hover:text-carbon"
          }`}
        >
          {y}
        </Link>
      ))}
    </div>
  );
}

const fmtDate = (d: string | null) => (d ? format(parseISO(d), "d MMM") : "—");

export default async function RacesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requirePermission(PERMISSIONS.RACES_MANAGE);
  const sp = await searchParams;

  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.year));
  if (!allSeasons.length) {
    return (
      <>
        <PageHeader title="Race Weekends" sub="Season calendar & session timetables" />
        <EmptyState title="No seasons yet" hint="Seed a season before creating race weekends." />
      </>
    );
  }

  const years = allSeasons.map((s) => s.year);
  const parsedYear = Number(sp.year);
  const year = years.includes(parsedYear) ? parsedYear : years[0];

  const gps = await db.query.grandsPrix.findMany({
    where: eq(grandsPrix.seasonYear, year),
    orderBy: (t, { asc }) => [asc(t.round)],
    with: {
      circuit: { columns: { name: true, country: true } },
      sessions: { columns: { id: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Race Weekends"
        sub={`${gps.length} round${gps.length === 1 ? "" : "s"} in the ${year} season`}
        actions={<LinkButton href={`/races/new?year=${year}`}>New race weekend</LinkButton>}
      />

      <SeasonTabs years={years} active={year} />

      {gps.length ? (
        <Table
          head={
            <>
              <th className="w-12">Rd</th>
              <th>Grand Prix</th>
              <th>Circuit</th>
              <th>Dates</th>
              <th>Format</th>
              <th>Status</th>
              <th className="w-20 text-right">Sessions</th>
              <th className="w-16" />
            </>
          }
        >
          {gps.map((gp) => (
            <tr key={gp.id}>
              <td className="font-black">{gp.round}</td>
              <td>
                <Link href={`/races/${gp.id}`} className="font-bold hover:text-f1-red">
                  {gp.name}
                </Link>
              </td>
              <td className="text-f1-grey">
                {gp.circuit.name}
                <span className="text-f1-grey-light"> · {gp.circuit.country}</span>
              </td>
              <td className="whitespace-nowrap">
                {fmtDate(gp.startDate)} → {fmtDate(gp.endDate)}
              </td>
              <td>{gp.hasSprint ? <Badge tone="red">Sprint</Badge> : <span className="text-f1-grey-light">—</span>}</td>
              <td>
                <StatusPill status={gp.status} />
              </td>
              <td className="text-right font-bold">{gp.sessions.length}</td>
              <td className="text-right">
                <Link
                  href={`/races/${gp.id}`}
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
          title={`No race weekends in ${year}`}
          hint="Create the first round with “New race weekend”."
        />
      )}
    </>
  );
}
