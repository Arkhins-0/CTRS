import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/media";
import { teamGradient } from "./colors";
import type { DriverStandingRow } from "./data";

/* ── Standings podium card ─────────────────────────────────────────────────
   Reuses TeamCard's exact visual language (teamGradient, the .drs chevron
   mask) rather than inventing a second one: same bright-team-colour surface,
   same corner strip, so a driver card and a team card read as one family.
   The photo well is real — CardImage-style cutout, right where a driver
   headshot lands the moment one exists — but until CTR has real cutout
   photography (headshot_media_id is null for every driver today), it falls
   back to the car number as a huge translucent numeral instead of empty
   space, the same "no artwork yet" move TeamCard makes with initials. ───── */

const ORDINAL: Record<number, string> = { 1: "ST", 2: "ND", 3: "RD" };

function ordinalSuffix(position: number): string {
  if (position % 100 >= 11 && position % 100 <= 13) return "TH";
  return ORDINAL[position % 10] ?? "TH";
}

export function PodiumCard({
  row,
  emphasis = false,
}: {
  row: DriverStandingRow;
  /** The 1st-place card runs taller and the name reads a size up — the
   *  podium's actual top step, not just first in a list. */
  emphasis?: boolean;
}) {
  const { position, points, driver, team, carNumber } = row;
  const color = team?.color ?? "#67676d";
  const shot = mediaUrl(driver.headshotPath);

  return (
    <Link
      href={`/drivers/${driver.slug}`}
      className={`group relative z-0 flex flex-col justify-between overflow-hidden rounded-md p-5 text-white lg:p-6 ${
        emphasis ? "min-h-[224px] lg:min-h-[264px]" : "min-h-[192px] lg:min-h-[224px]"
      }`}
      style={{ "--team": color, ...teamGradient(color) } as CSSProperties}
    >
      {/* car-number watermark (stands in for a headshot until one exists) */}
      {!shot ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute -bottom-5 -right-2 select-none font-black italic leading-none text-white/10 ${
            emphasis ? "text-[8.5rem] lg:text-[10.5rem]" : "text-[6.5rem] lg:text-[8rem]"
          }`}
          style={{ fontFamily: "var(--font-digits)" }}
        >
          {carNumber ?? driver.code}
        </span>
      ) : (
        <Image
          src={shot}
          alt=""
          fill
          sizes="(max-width: 735px) 100vw, 33vw"
          className="object-cover object-top opacity-90"
        />
      )}

      {/* DRS chevron strip, bottom-right — same mask TeamCard uses */}
      <span
        aria-hidden
        className="drs drs-flip pointer-events-none absolute -bottom-0.5 right-0 z-10 h-24 w-1/2 lg:h-32"
      />

      <div className="technical-4xl relative z-20 flex items-start gap-1">
        {position}
        <span className="body-xs mt-1.5 font-bold">{ordinalSuffix(position)}</span>
      </div>

      <div className="relative z-20 flex flex-col gap-1">
        <p className={`${emphasis ? "display-xl lg:display-2xl" : "display-l lg:display-xl"} font-medium group-hover:underline`}>
          {driver.firstName}
          <br />
          <span className="font-black uppercase">{driver.lastName}</span>
        </p>
        {team ? (
          <p className="body-xs font-semibold uppercase text-white/70">{team.shortName}</p>
        ) : null}
        <p className="technical-2xl mt-1 flex items-baseline gap-1.5">
          {points}
          <span className="body-2xs font-bold uppercase text-white/70">pts</span>
        </p>
      </div>
    </Link>
  );
}

/** Top-3 podium band — mobile stacks vertically with P1 taller (the actual
 *  top step); lg+ runs three columns. Renders nothing below 2 ranked rows. */
export function PodiumBand({ rows }: { rows: DriverStandingRow[] }) {
  const top = rows.slice(0, 3);
  if (top.length < 2) return null;
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
      {top.map((row) => (
        <PodiumCard key={row.driver.slug} row={row} emphasis={row.position === 1} />
      ))}
    </div>
  );
}
