import { DriverIdentityCard } from "./driver-identity-card";
import type { DriverStandingRow } from "./data";

/* ── Standings podium ──────────────────────────────────────────────────────
   The shared driver card carrying a position and a points total, with the
   leader a size up — the podium's actual top step, not just first in a
   list. ──────────────────────────────────────────────────────────────────── */

export function PodiumCard({
  row,
  emphasis = false,
}: {
  row: DriverStandingRow;
  emphasis?: boolean;
}) {
  return (
    <DriverIdentityCard
      driver={row.driver}
      teamColor={row.team?.color}
      teamName={row.team?.shortName}
      carNumber={row.carNumber}
      position={row.position}
      points={row.points}
      size={emphasis ? "lg" : "md"}
    />
  );
}

/** Top-3 podium band — stacks on mobile with P1 taller, three columns at lg.
 *  Renders nothing below 2 ranked rows. */
export function PodiumBand({ rows }: { rows: DriverStandingRow[] }) {
  const top = rows.slice(0, 3);
  if (top.length < 2) return null;
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-end lg:gap-4">
      {top.map((row) => (
        <PodiumCard key={row.driver.slug} row={row} emphasis={row.position === 1} />
      ))}
    </div>
  );
}
