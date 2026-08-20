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

const th = "px-3 py-2.5 text-xs font-bold uppercase tracking-wider";
const td = "px-3 py-2.5";

function DriverCell({ row }: { row: ClassificationRow }) {
  return (
    <span className="flex items-center gap-2">
      <TeamColorBar color={row.team.color} />
      <span className="font-bold text-fg-faint">{row.driver.code}</span>
      <Link
        href={`/drivers/${row.driver.slug}`}
        className="whitespace-nowrap font-semibold text-white hover:text-accent"
      >
        {row.driver.firstName} {row.driver.lastName}
      </Link>
      <CountryFlag code={row.driver.countryCode} />
    </span>
  );
}

function PosCell({ row }: { row: ClassificationRow }) {
  return (
    <td className={`${td} font-black text-white`}>
      {row.position ?? STATUS_SHORT[row.status] ?? "—"}
    </td>
  );
}

/** "+1.234s" gap for single-session qualifying / practice screens. */
function qualiGap(row: ClassificationRow, leaderMs: number | null): string {
  if (row.position === 1) return "—";
  if (row.gapMs != null) return `+${(row.gapMs / 1000).toFixed(3)}s`;
  const t = row.q1TimeMs ?? row.timeMs;
  if (t != null && leaderMs != null && t >= leaderMs) return `+${((t - leaderMs) / 1000).toFixed(3)}s`;
  return STATUS_SHORT[row.status] ?? "—";
}

/**
 * Dark session classification table. Column set adapts to the session type:
 * race/race2 → LAPS + TIME/GAP + PTS · qualifying (INCRC runs a single
 * session) → TIME + GAP · practice → TIME + LAPS.
 * Rows must already be ordered (position, nulls last).
 */
export function ResultsTable({
  rows,
  sessionType,
}: {
  rows: ClassificationRow[];
  sessionType: SessionType;
}) {
  const kind = resultsTableKind(sessionType);
  const leaderMs = rows[0] ? (rows[0].q1TimeMs ?? rows[0].timeMs) : null;

  return (
    <div className="chamfer-tr overflow-x-auto border border-line bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="bg-panel text-white">
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
                <th className={`${th} text-right`}>Time</th>
                <th className={`${th} text-right`}>Gap</th>
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
            <tr key={row.id} className="border-b border-line last:border-0 hover:bg-panel/60">
              <PosCell row={row} />
              <td className={`${td} font-bold text-fg-faint`}>{row.carNumber}</td>
              <td className={td}>
                <DriverCell row={row} />
              </td>
              <td className={`${td} whitespace-nowrap text-fg-muted`}>{row.team.shortName}</td>
              {kind === "race" ? (
                <>
                  <td className={`${td} text-right tabular-nums text-fg-muted`}>
                    {row.laps ?? "—"}
                  </td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums text-fg-muted`}>
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
                  <td className={`${td} text-right font-black tabular-nums text-white`}>
                    {row.points}
                  </td>
                </>
              ) : kind === "qualifying" ? (
                <>
                  <td className={`${td} text-right font-semibold tabular-nums text-white`}>
                    {formatLapTime(row.q1TimeMs ?? row.timeMs)}
                  </td>
                  <td className={`${td} text-right tabular-nums text-fg-muted`}>
                    {qualiGap(row, leaderMs)}
                  </td>
                </>
              ) : (
                <>
                  <td className={`${td} text-right font-semibold tabular-nums text-white`}>
                    {formatLapTime(row.timeMs)}
                  </td>
                  <td className={`${td} text-right tabular-nums text-fg-muted`}>
                    {row.laps ?? "—"}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
