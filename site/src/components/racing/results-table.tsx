import Link from "next/link";
import { formatGap, formatLapTime } from "@ctr/db";
import { CountryFlag, TeamColorBar } from "@ctr/ui";
import type { ClassificationRow } from "./data";
import { resultsTableKind, type SessionType } from "./meta";

const STATUS_SHORT: Record<string, string> = {
  dnf: "DNF",
  dns: "DNS",
  dsq: "DSQ",
  nc: "NC",
};

const th = "px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider";
const td = "px-3 py-2.5";

function DriverCell({ row }: { row: ClassificationRow }) {
  return (
    <span className="flex items-center gap-2">
      <TeamColorBar color={row.team.color} />
      <span className="font-bold text-f1-grey">{row.driver.code}</span>
      <Link
        href={`/drivers/${row.driver.slug}`}
        className="whitespace-nowrap font-semibold text-carbon hover:text-f1-red"
      >
        {row.driver.firstName} {row.driver.lastName}
      </Link>
      <CountryFlag code={row.driver.countryCode} />
    </span>
  );
}

function PosCell({ row }: { row: ClassificationRow }) {
  return (
    <td className={`${td} font-black text-carbon`}>
      {row.position ?? STATUS_SHORT[row.status] ?? "—"}
    </td>
  );
}

/**
 * Session classification table. Column set adapts to the session type:
 * race/sprint → LAPS + TIME/GAP + PTS · qualifying → Q1/Q2/Q3 · practice →
 * TIME + LAPS. Rows must already be ordered (position, nulls last).
 */
export function ResultsTable({
  rows,
  sessionType,
}: {
  rows: ClassificationRow[];
  sessionType: SessionType;
}) {
  const kind = resultsTableKind(sessionType);
  const qPrefix = sessionType === "sprint_qualifying" ? "SQ" : "Q";

  return (
    <div className="chamfer-tr overflow-x-auto border border-warm-grey bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="bg-carbon text-white">
            <th className={`${th} w-14`}>Pos</th>
            <th className={`${th} w-12`}>No</th>
            <th className={th}>Driver</th>
            <th className={th}>Team</th>
            {kind === "race" ? (
              <>
                <th className={`${th} text-right`}>Laps</th>
                <th className={`${th} text-right`}>Time / Gap</th>
                <th className={`${th} text-right`}>Pts</th>
              </>
            ) : kind === "qualifying" ? (
              <>
                <th className={`${th} text-right`}>{qPrefix}1</th>
                <th className={`${th} text-right`}>{qPrefix}2</th>
                <th className={`${th} text-right`}>{qPrefix}3</th>
              </>
            ) : (
              <>
                <th className={`${th} text-right`}>Time</th>
                <th className={`${th} text-right`}>Laps</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-warm-grey last:border-0 hover:bg-off-white">
              <PosCell row={row} />
              <td className={`${td} font-bold text-f1-grey`}>{row.carNumber}</td>
              <td className={td}>
                <DriverCell row={row} />
              </td>
              <td className={`${td} whitespace-nowrap text-f1-grey`}>{row.team.shortName}</td>
              {kind === "race" ? (
                <>
                  <td className={`${td} text-right tabular-nums`}>{row.laps ?? "—"}</td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                    {formatGap({
                      position: row.position,
                      status: row.status,
                      gapMs: row.gapMs,
                      lapsBehind: row.lapsBehind,
                      timeMs: row.timeMs,
                    })}
                    {row.fastestLap ? (
                      <span className="ml-2 inline-block rounded-sm bg-purple-600 px-1.5 py-0.5 align-middle text-[10px] font-black leading-none text-white">
                        FL
                      </span>
                    ) : null}
                  </td>
                  <td className={`${td} text-right font-black tabular-nums text-carbon`}>
                    {row.points}
                  </td>
                </>
              ) : kind === "qualifying" ? (
                <>
                  <td className={`${td} text-right tabular-nums`}>{formatLapTime(row.q1TimeMs)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatLapTime(row.q2TimeMs)}</td>
                  <td className={`${td} text-right font-semibold tabular-nums`}>
                    {formatLapTime(row.q3TimeMs)}
                  </td>
                </>
              ) : (
                <>
                  <td className={`${td} text-right font-semibold tabular-nums`}>
                    {formatLapTime(row.timeMs)}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{row.laps ?? "—"}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
