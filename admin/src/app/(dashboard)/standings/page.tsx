import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { TeamColorBar } from "@ctr/ui";
import { constructorStandings, db, driverStandings, seasons, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, PageHeader, Table } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { recalcStandingsAction } from "./actions";

export const dynamic = "force-dynamic";

function SeasonTabs({ years, active }: { years: number[]; active: number }) {
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b-2 border-carbon">
      {years.map((y) => (
        <Link
          key={y}
          href={`/standings?year=${y}`}
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

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requirePermission(PERMISSIONS.RESULTS_MANAGE);
  const sp = await searchParams;

  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.year));
  if (!allSeasons.length) {
    return (
      <>
        <PageHeader title="Standings" sub="Championship snapshots" />
        <EmptyState title="No seasons yet" hint="Seed a season before computing standings." />
      </>
    );
  }

  const years = allSeasons.map((s) => s.year);
  const parsedYear = Number(sp.year);
  const year = years.includes(parsedYear) ? parsedYear : years[0];

  const [driverRows, teamRows] = await Promise.all([
    db.query.driverStandings.findMany({
      where: eq(driverStandings.seasonYear, year),
      orderBy: (t, { asc }) => [asc(t.position)],
      with: { driver: { columns: { firstName: true, lastName: true, code: true } } },
    }),
    db.query.constructorStandings.findMany({
      where: eq(constructorStandings.seasonYear, year),
      orderBy: (t, { asc }) => [asc(t.position)],
      with: { teamSeasonEntry: { columns: { displayName: true, primaryColor: true } } },
    }),
  ]);

  const meta = driverRows[0] ?? teamRows[0];

  return (
    <>
      <PageHeader
        title="Standings"
        sub="Snapshots recomputed automatically on every results publish"
        actions={
          <form action={recalcStandingsAction}>
            <input type="hidden" name="year" value={year} />
            <SubmitButton variant="secondary">Recalculate {year} standings</SubmitButton>
          </form>
        }
      />

      <SeasonTabs years={years} active={year} />

      {meta ? (
        <p className="mb-4 text-sm text-f1-grey">
          Computed through round <span className="font-black text-carbon">{meta.computedThroughRound}</span>
          {" · "}last updated {format(meta.updatedAt, "d MMM yyyy, HH:mm")}
        </p>
      ) : null}

      {driverRows.length || teamRows.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <div>
            <h2 className="mb-2 text-sm font-black uppercase tracking-wide">Drivers&rsquo; Championship</h2>
            {driverRows.length ? (
              <Table
                head={
                  <>
                    <th className="w-12">Pos</th>
                    <th>Driver</th>
                    <th className="text-right">Wins</th>
                    <th className="text-right">Podiums</th>
                    <th className="text-right">Poles</th>
                    <th className="text-right">Pts</th>
                  </>
                }
              >
                {driverRows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-black">{r.position}</td>
                    <td>
                      <span className="font-bold">
                        {r.driver.firstName} {r.driver.lastName}
                      </span>{" "}
                      <span className="text-xs font-black text-f1-grey">{r.driver.code}</span>
                    </td>
                    <td className="text-right">{r.wins}</td>
                    <td className="text-right">{r.podiums}</td>
                    <td className="text-right">{r.poles}</td>
                    <td className="text-right font-black">{r.points}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState title="No driver standings yet" />
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-black uppercase tracking-wide">Constructors&rsquo; Championship</h2>
            {teamRows.length ? (
              <Table
                head={
                  <>
                    <th className="w-12">Pos</th>
                    <th>Team</th>
                    <th className="text-right">Wins</th>
                    <th className="text-right">Pts</th>
                  </>
                }
              >
                {teamRows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-black">{r.position}</td>
                    <td>
                      <span className="flex items-stretch gap-2">
                        <TeamColorBar color={r.teamSeasonEntry.primaryColor} />
                        <span className="font-bold">{r.teamSeasonEntry.displayName}</span>
                      </span>
                    </td>
                    <td className="text-right">{r.wins}</td>
                    <td className="text-right font-black">{r.points}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState title="No constructor standings yet" />
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          title={`No standings for ${year} yet`}
          hint="Publish results (or hit Recalculate) to build the snapshots."
        />
      )}
    </>
  );
}
