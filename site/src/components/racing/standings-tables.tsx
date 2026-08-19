import Link from "next/link";
import { CountryFlag, TeamColorBar } from "@ctr/ui";
import type { ConstructorStandingRow, DriverStandingRow } from "./data";

const th = "px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider";
const td = "px-3 py-2.5";

/** Drivers' championship table. */
export function DriverStandingsTable({ rows }: { rows: DriverStandingRow[] }) {
  return (
    <div className="chamfer-tr overflow-x-auto border border-warm-grey bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="bg-carbon text-white">
            <th className={`${th} w-14`}>Pos</th>
            <th className={th}>Driver</th>
            <th className={th}>Team</th>
            <th className={`${th} text-right`}>Wins</th>
            <th className={`${th} text-right`}>Podiums</th>
            <th className={`${th} text-right`}>Poles</th>
            <th className={`${th} text-right`}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.driver.slug}
              className="border-b border-warm-grey last:border-0 hover:bg-off-white"
            >
              <td className={`${td} font-black text-carbon`}>{row.position}</td>
              <td className={td}>
                <span className="flex items-center gap-2">
                  <TeamColorBar color={row.team?.color} />
                  <Link
                    href={`/drivers/${row.driver.slug}`}
                    className="whitespace-nowrap font-semibold text-carbon hover:text-f1-red"
                  >
                    {row.driver.firstName} {row.driver.lastName}
                  </Link>
                  <CountryFlag code={row.driver.countryCode} />
                </span>
              </td>
              <td className={`${td} whitespace-nowrap text-f1-grey`}>
                {row.team ? (
                  <Link href={`/teams/${row.team.teamSlug}`} className="hover:text-f1-red">
                    {row.team.shortName}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className={`${td} text-right tabular-nums`}>{row.wins}</td>
              <td className={`${td} text-right tabular-nums`}>{row.podiums}</td>
              <td className={`${td} text-right tabular-nums`}>{row.poles}</td>
              <td className={`${td} text-right text-base font-black tabular-nums text-carbon`}>
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Constructors' championship table. */
export function ConstructorStandingsTable({ rows }: { rows: ConstructorStandingRow[] }) {
  return (
    <div className="chamfer-tr overflow-x-auto border border-warm-grey bg-white">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="bg-carbon text-white">
            <th className={`${th} w-14`}>Pos</th>
            <th className={th}>Team</th>
            <th className={`${th} text-right`}>Wins</th>
            <th className={`${th} text-right`}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.team.teamSlug}
              className="border-b border-warm-grey last:border-0 hover:bg-off-white"
            >
              <td className={`${td} font-black text-carbon`}>{row.position}</td>
              <td className={td}>
                <span className="flex items-center gap-2">
                  <TeamColorBar color={row.team.color} />
                  <Link
                    href={`/teams/${row.team.teamSlug}`}
                    className="font-semibold text-carbon hover:text-f1-red"
                  >
                    {row.team.displayName}
                  </Link>
                </span>
              </td>
              <td className={`${td} text-right tabular-nums`}>{row.wins}</td>
              <td className={`${td} text-right text-base font-black tabular-nums text-carbon`}>
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
