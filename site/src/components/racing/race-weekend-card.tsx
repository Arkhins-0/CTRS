import Link from "next/link";
import { Badge, CountryFlag, TeamColorBar } from "@ctr/ui";
import type { ScheduleGp } from "./data";
import { formatDateRange } from "./meta";

/** One race-weekend card on the schedule grid. `upNext` renders the larger,
 *  red-bordered highlight variant. */
export function RaceWeekendCard({
  gp,
  year,
  upNext = false,
}: {
  gp: ScheduleGp;
  year: number;
  upNext?: boolean;
}) {
  const dates = formatDateRange(gp.startDate, gp.endDate);

  return (
    <Link
      href={`/schedule/${year}/${gp.slug}`}
      className={`group block ${upNext ? "sm:col-span-2" : ""}`}
    >
      <article
        className={`chamfer-tr flex h-full flex-col bg-white transition-transform duration-150 group-hover:-translate-y-1 ${
          upNext ? "border-2 border-f1-red p-5 sm:p-6" : "border border-warm-grey p-4"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-f1-grey">
            Round {gp.round}
          </p>
          <span className="flex shrink-0 gap-1.5 pr-3">
            {upNext ? <Badge tone="red">Up Next</Badge> : null}
            {gp.hasSprint ? <Badge tone="dark">Sprint</Badge> : null}
            {gp.status === "live" ? <Badge tone="green">Live</Badge> : null}
            {gp.status === "cancelled" ? <Badge tone="outline">Cancelled</Badge> : null}
          </span>
        </div>

        <h3
          className={`mt-2 font-black uppercase tracking-tight text-carbon group-hover:text-f1-red ${
            upNext ? "text-2xl sm:text-3xl" : "text-lg"
          }`}
        >
          {gp.name}
        </h3>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-f1-grey">
          <CountryFlag code={gp.circuit.countryCode} />
          <span>
            {gp.circuit.locality ? `${gp.circuit.locality}, ` : ""}
            {gp.circuit.country}
          </span>
        </p>

        {dates ? (
          <p className={`mt-2 font-bold text-carbon ${upNext ? "text-base" : "text-sm"}`}>{dates}</p>
        ) : null}

        {gp.winner ? (
          <div className="mt-auto border-t border-warm-grey pt-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-f1-grey">Winner</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-bold text-carbon">
              <TeamColorBar color={gp.winner.teamColor} />
              <span>
                {gp.winner.firstName} {gp.winner.lastName}
              </span>
              <CountryFlag code={gp.winner.countryCode} />
            </p>
          </div>
        ) : (
          <div className="mt-auto" />
        )}
      </article>
    </Link>
  );
}
