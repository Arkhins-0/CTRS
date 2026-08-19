import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag, SectionHeading } from "@ctr/ui";
import { getTeamDetail } from "@/components/racing/data";
import { getCurrentSeasonYear } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const currentYear = await getCurrentSeasonYear();
  const team = await getTeamDetail(slug, currentYear);
  if (!team) return {};
  return {
    title: team.name,
    description: `${team.fullName ?? team.name} — team profile, current season and championship history.`,
  };
}

function FactTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="chamfer-tr border border-warm-grey bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-f1-grey">{label}</p>
      <p className="mt-1 text-xl font-black tracking-tight text-carbon">{value}</p>
    </div>
  );
}

const th = "px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider";
const td = "px-3 py-2.5";

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const currentYear = await getCurrentSeasonYear();
  const team = await getTeamDetail(slug, currentYear);
  if (!team) notFound();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <section
        className="chamfer-tr-lg bg-carbon-fibre p-6 text-white sm:p-8"
        style={{ borderTop: `8px solid ${team.color}` }}
      >
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-f1-grey-light">
          <CountryFlag code={team.countryCode} />
          {team.base ?? "Formula Racing Team"}
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-5xl">
          {team.name}
        </h1>
        {team.fullName ? (
          <p className="mt-1 text-sm font-semibold text-f1-grey-light">{team.fullName}</p>
        ) : null}
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm font-bold uppercase tracking-wide">
          <span>
            <span className="text-f1-grey-light">Championships</span>{" "}
            <span className="text-white">{team.worldChampionships}</span>
          </span>
          {team.firstEntryYear != null ? (
            <span>
              <span className="text-f1-grey-light">First Entry</span>{" "}
              <span className="text-white">{team.firstEntryYear}</span>
            </span>
          ) : null}
        </p>
      </section>

      {team.description ? (
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-f1-grey">{team.description}</p>
      ) : null}

      {/* Current season */}
      {team.current ? (
        <section className="mt-10">
          <SectionHeading
            right={
              team.current.standing ? (
                <Link
                  href={`/standings/${team.current.seasonYear}/constructors`}
                  className="text-f1-red hover:text-f1-red-dark"
                >
                  P{team.current.standing.position} · {team.current.standing.points} pts →
                </Link>
              ) : undefined
            }
          >
            {team.current.seasonYear} Season
          </SectionHeading>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FactTile label="Car" value={team.current.car?.modelName ?? "—"} />
            <FactTile label="Chassis" value={team.current.car?.chassis ?? "—"} />
            <FactTile
              label="Power Unit"
              value={team.current.car?.powerUnit ?? team.current.powerUnitSupplier ?? "—"}
            />
            <FactTile label="Team Principal" value={team.current.teamPrincipal ?? "—"} />
          </div>

          {team.current.drivers.length ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {team.current.drivers.map((driver) => (
                <Link key={driver.slug} href={`/drivers/${driver.slug}`} className="group block">
                  <div
                    className="chamfer-tr flex items-center gap-4 border border-warm-grey border-t-4 bg-white p-4 transition-transform duration-150 group-hover:-translate-y-0.5"
                    style={{ borderTopColor: team.current?.color }}
                  >
                    <span className="text-3xl font-black italic leading-none text-warm-grey">
                      {driver.carNumber}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-f1-grey">
                        {driver.firstName}
                      </span>
                      <span className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-carbon group-hover:text-f1-red">
                        {driver.lastName}
                        <CountryFlag code={driver.countryCode} className="text-base" />
                      </span>
                    </span>
                    <span className="ml-auto text-sm font-bold uppercase text-f1-grey">
                      {driver.code}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Season-by-season history */}
      {team.history.length ? (
        <section className="mt-10">
          <SectionHeading>Season by Season</SectionHeading>
          <div className="chamfer-tr mt-4 overflow-x-auto border border-warm-grey bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="bg-carbon text-white">
                  <th className={`${th} w-20`}>Year</th>
                  <th className={th}>Entry Name</th>
                  <th className={th}>Car</th>
                  <th className={`${th} text-right`}>Pos</th>
                  <th className={`${th} text-right`}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {team.history.map((row) => (
                  <tr
                    key={row.seasonYear}
                    className="border-b border-warm-grey last:border-0 hover:bg-off-white"
                  >
                    <td className={`${td} font-black text-carbon`}>
                      <Link
                        href={`/standings/${row.seasonYear}/constructors`}
                        className="hover:text-f1-red"
                      >
                        {row.seasonYear}
                      </Link>
                    </td>
                    <td className={`${td} font-semibold text-carbon`}>{row.displayName}</td>
                    <td className={`${td} text-f1-grey`}>{row.carModel ?? "—"}</td>
                    <td className={`${td} text-right font-bold tabular-nums`}>
                      {row.position != null ? `P${row.position}` : "—"}
                    </td>
                    <td className={`${td} text-right font-black tabular-nums text-carbon`}>
                      {row.points ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
