import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { TeamColorBar } from "@ctr/ui";
import { constructorStandings, db, driverStandings, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, PageHeader, Table } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { loadSeasonTabs, pickSeason, SeasonTabs } from "@/components/racing/season-tabs";
import { recalcStandingsAction } from "./actions";

export const dynamic = "force-dynamic";

type CategoryInfo = { id: string; shortName: string; color: string; sort: number } | null;

const catKey = (c: CategoryInfo) => c?.id ?? "__none__";

function DriversTable({
  rows,
}: {
  rows: {
    id: string;
    position: number;
    wins: number;
    podiums: number;
    poles: number;
    points: number;
    driver: { firstName: string; lastName: string; code: string };
  }[];
}) {
  return (
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
      {rows.map((r) => (
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
  );
}

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  await requirePermission(PERMISSIONS.RESULTS_MANAGE);
  const sp = await searchParams;

  const seasons = await loadSeasonTabs();
  const season = pickSeason(seasons, sp.season);
  if (!season) {
    return (
      <>
        <PageHeader title="Standings" sub="Championship snapshots" />
        <EmptyState
          title="No championship seasons yet"
          hint="Create a championship season before computing standings."
        />
      </>
    );
  }

  const [driverRows, teamRows] = await Promise.all([
    db.query.driverStandings.findMany({
      where: eq(driverStandings.championshipSeasonId, season.id),
      orderBy: (t, { asc }) => [asc(t.position)],
      with: {
        driver: { columns: { firstName: true, lastName: true, code: true } },
        category: { columns: { id: true, shortName: true, color: true, sort: true } },
      },
    }),
    db.query.constructorStandings.findMany({
      where: eq(constructorStandings.championshipSeasonId, season.id),
      orderBy: (t, { asc }) => [asc(t.position)],
      with: {
        teamSeasonEntry: { columns: { displayName: true, primaryColor: true } },
        category: { columns: { id: true, shortName: true, color: true, sort: true } },
      },
    }),
  ]);

  const meta = driverRows[0] ?? teamRows[0];

  // one block per category (standings are computed per racing class)
  const groups = new Map<
    string,
    {
      category: CategoryInfo;
      overall: typeof driverRows;
      subTables: Map<string, typeof driverRows>;
      teams: typeof teamRows;
    }
  >();
  const groupFor = (category: CategoryInfo) => {
    const key = catKey(category);
    let g = groups.get(key);
    if (!g) {
      g = { category, overall: [], subTables: new Map(), teams: [] };
      groups.set(key, g);
    }
    return g;
  };
  for (const r of driverRows) {
    const g = groupFor(r.category);
    if (r.standingsType === "overall") g.overall.push(r);
    else {
      const list = g.subTables.get(r.standingsType) ?? [];
      list.push(r);
      g.subTables.set(r.standingsType, list);
    }
  }
  for (const r of teamRows) groupFor(r.category).teams.push(r);

  const orderedGroups = [...groups.values()].sort(
    (a, b) => (a.category?.sort ?? -1) - (b.category?.sort ?? -1),
  );

  return (
    <>
      <PageHeader
        title="Standings"
        sub="Snapshots recomputed automatically on every results publish"
        actions={
          <form action={recalcStandingsAction}>
            <input type="hidden" name="championshipSeasonId" value={season.id} />
            <SubmitButton variant="secondary">Recalculate {season.label} standings</SubmitButton>
          </form>
        }
      />

      <SeasonTabs seasons={seasons} activeId={season.id} base="/standings" />

      {meta ? (
        <p className="mb-4 text-sm text-f1-grey">
          Computed through round <span className="font-black text-carbon">{meta.computedThroughRound}</span>
          {" · "}last updated {format(meta.updatedAt, "d MMM yyyy, HH:mm")}
        </p>
      ) : null}

      {orderedGroups.length ? (
        <div className="space-y-8">
          {orderedGroups.map((g) => (
            <section key={catKey(g.category)}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                {g.category ? (
                  <>
                    <span
                      aria-hidden
                      className="inline-block size-3 rounded-sm border border-warm-grey"
                      style={{ backgroundColor: g.category.color }}
                    />
                    {g.category.shortName}
                  </>
                ) : (
                  "Championship"
                )}
              </h2>

              <div className="grid gap-5 xl:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-f1-grey">
                    Drivers&rsquo; standings
                  </h3>
                  {g.overall.length ? (
                    <DriversTable rows={g.overall} />
                  ) : (
                    <EmptyState title="No driver standings yet" />
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-f1-grey">
                    Teams&rsquo; standings
                  </h3>
                  {g.teams.length ? (
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
                      {g.teams.map((r) => (
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
                    <EmptyState title="No team standings yet" />
                  )}
                </div>

                {[...g.subTables.entries()].map(([type, rows]) => (
                  <div key={type}>
                    <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-f1-grey">
                      {type} standings
                    </h3>
                    <DriversTable rows={rows} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No standings for ${season.label} yet`}
          hint="Publish results (or hit Recalculate) to build the snapshots."
        />
      )}
    </>
  );
}
