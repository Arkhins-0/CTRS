import Image from "next/image";
import Link from "next/link";
import { CountryFlag } from "@ctr/ui";
import { mediaUrl, placeholderStyle } from "@/lib/media";
import { InlineCountdown } from "./countdown";
import type { ScheduleGp } from "./data";
import { formatDateRange } from "./meta";

/**
 * One round card on the calendar grid. `next` renders the fully
 * accent-coloured "NEXT RACE" variant with a live lights-out countdown.
 * Completed rounds show the flagship-category podium instead of the photo.
 */
export function RoundCard({
  gp,
  year,
  next = false,
}: {
  gp: ScheduleGp;
  year: number;
  next?: boolean;
}) {
  const dates = formatDateRange(gp.startDate, gp.endDate);
  const photo = mediaUrl(gp.circuit.photoPath ?? gp.circuit.mapPath);
  const city = gp.circuit.locality ?? gp.circuit.name;

  const chip = next
    ? "bg-accent-fg/10 text-accent-fg"
    : "bg-panel text-fg-muted";

  return (
    <Link href={`/schedule/${year}/${gp.slug}`} className="group block h-full">
      <article
        className={`chamfer-tr flex h-full flex-col overflow-hidden transition-all duration-150 group-hover:-translate-y-1 ${
          next
            ? "bg-accent text-accent-fg"
            : "border border-line bg-surface group-hover:border-accent"
        }`}
      >
        {/* Chips row */}
        <div className="flex items-center justify-between gap-2 p-4 pb-0">
          <span
            className={`chamfer-tr px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${chip}`}
            style={{ ["--chamfer" as string]: "6px" }}
          >
            Round {gp.round}
          </span>
          <span className="flex items-center gap-1.5 pr-3">
            {gp.status === "live" ? (
              <span className="bg-emerald-600 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                Live
              </span>
            ) : null}
            {gp.status === "cancelled" ? (
              <span
                className={`text-[10px] font-black uppercase tracking-wider line-through ${next ? "text-accent-fg/70" : "text-fg-faint"}`}
              >
                Cancelled
              </span>
            ) : null}
            {dates ? (
              <span
                className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  next ? "text-accent-fg/80" : "border border-line text-fg-muted"
                }`}
              >
                {dates}
              </span>
            ) : null}
          </span>
        </div>

        {/* Identity */}
        <div className="p-4 pt-3">
          {next ? (
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.25em]">
              Next Race <span aria-hidden>→</span>
            </p>
          ) : null}
          <h3
            className={`flex items-center gap-2 text-2xl font-black uppercase tracking-tight ${
              next ? "" : "text-white group-hover:text-accent"
            }`}
          >
            {city}
            <CountryFlag code={gp.circuit.countryCode} className="text-lg" />
          </h3>
          {gp.officialName ? (
            <p
              className={`mt-1 line-clamp-2 text-[11px] font-semibold leading-snug ${
                next ? "text-accent-fg/75" : "text-fg-faint"
              }`}
            >
              {gp.officialName}
            </p>
          ) : null}
          <p
            className={`mt-1.5 text-xs font-bold uppercase tracking-wider ${
              next ? "text-accent-fg/85" : "text-fg-muted"
            }`}
          >
            {gp.circuit.name}
          </p>
          {next && gp.firstRaceStartsAt ? (
            <InlineCountdown
              targetIso={gp.firstRaceStartsAt}
              className="mt-3 block text-sm font-black uppercase tracking-wider"
            />
          ) : null}
        </div>

        {/* Podium (completed) or circuit photo */}
        {gp.podium && gp.podium.lines.length ? (
          <div
            className={`mt-auto border-t p-4 ${next ? "border-accent-fg/15" : "border-line bg-panel/60"}`}
          >
            <p
              className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                next ? "text-accent-fg/70" : "text-fg-faint"
              }`}
              style={next ? undefined : { color: gp.podium.categoryColor }}
            >
              Podium · {gp.podium.categoryShortName}
            </p>
            <ul className="mt-2 space-y-1">
              {gp.podium.lines.map((line) => (
                <li
                  key={line.position}
                  className={`flex items-baseline gap-2 text-sm font-bold ${next ? "" : "text-white"}`}
                >
                  <span className="w-5 font-black">{line.position}</span>
                  <span>{line.code}</span>
                  <span
                    className={`ml-auto text-xs font-semibold tabular-nums ${
                      next ? "text-accent-fg/75" : "text-fg-muted"
                    }`}
                  >
                    {line.gap}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="relative mt-auto h-32 w-full overflow-hidden">
            {photo ? (
              <Image
                src={photo}
                alt={gp.circuit.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div
                className="flex h-full w-full items-end p-3"
                style={placeholderStyle(gp.circuit.name)}
              >
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">
                  {gp.circuit.name}
                </span>
              </div>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}
