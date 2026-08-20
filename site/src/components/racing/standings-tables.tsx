import Link from "next/link";
import { CountryFlag, TeamColorBar } from "@ctr/ui";
import type { ConstructorStandingRow, DriverStandingRow } from "./data";

const th = "px-3 py-2.5 text-xs font-bold uppercase tracking-wider";
const td = "px-3 py-2.5";

/** Per-category drivers' championship table (dark). */
export function DriverStandingsTable({ rows }: { rows: DriverStandingRow[] }) {
  return (
    <div className="chamfer-tr overflow-x-auto border border-line bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="bg-panel text-white">
            <th className={`${th} w-14`}>Pos</th>
            <th className={th}>Driver</th>
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
              className="border-b border-line last:border-0 hover:bg-panel/60"
            >
              <td className={`${td} font-black text-white`}>{row.position}</td>
              <td className={td}>
                <span className="flex items-center gap-2.5">
                  <TeamColorBar color={row.team?.color} />
                  <span className="min-w-0">
                    <Link
                      href={`/drivers/${row.driver.slug}`}
                      className="block whitespace-nowrap font-bold text-white hover:text-accent"
                    >
                      {row.driver.firstName} {row.driver.lastName}
                    </Link>
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
                      {row.carNumber != null ? `#${row.carNumber}` : row.driver.code}
                      {row.team ? (
                        <>
                          {" · "}
                          <Link
                            href={`/teams/${row.team.teamSlug}`}
                            className="hover:text-accent"
                          >
                            {row.team.shortName}
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </span>
                  <CountryFlag code={row.driver.countryCode} />
                </span>
              </td>
              <td className={`${td} text-right tabular-nums text-fg-muted`}>{row.wins}</td>
              <td className={`${td} text-right tabular-nums text-fg-muted`}>{row.podiums}</td>
              <td className={`${td} text-right tabular-nums text-fg-muted`}>{row.poles}</td>
              <td className={`${td} text-right text-base font-black tabular-nums text-white`}>
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Per-category constructors' (teams') championship table (dark). */
export function ConstructorStandingsTable({ rows }: { rows: ConstructorStandingRow[] }) {
  return (
    <div className="chamfer-tr overflow-x-auto border border-line bg-surface">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="bg-panel text-white">
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
              className="border-b border-line last:border-0 hover:bg-panel/60"
            >
              <td className={`${td} font-black text-white`}>{row.position}</td>
              <td className={td}>
                <span className="flex items-center gap-2.5">
                  <TeamColorBar color={row.team.color} />
                  <Link
                    href={`/teams/${row.team.teamSlug}`}
                    className="font-bold text-white hover:text-accent"
                  >
                    {row.team.displayName}
                  </Link>
                </span>
              </td>
              <td className={`${td} text-right tabular-nums text-fg-muted`}>{row.wins}</td>
              <td className={`${td} text-right text-base font-black tabular-nums text-white`}>
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
