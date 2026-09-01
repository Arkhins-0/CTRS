import Image from "next/image";
import Link from "next/link";
import { CountryFlag } from "@ctr/ui";
import { mediaUrl } from "@/lib/media";
import { StatusChip } from "./category-ui";
import { InlineCountdown } from "./countdown";
import type { ScheduleGp } from "./data";
import { formatDateRange, roundLabel } from "./meta";

/* ── Season-calendar card ──────────────────────────────────────────────────
   One card per round: the CIRCUIT PHOTO fills the whole card, darkened by a
   black scrim so every word on top is white — no floating track-map art
   (an earlier pass tried that; the map files have opaque white canvases and
   it looked broken). Completed rounds lay the stepped podium over the
   photo, the next round tints its scrim live-blue and carries the
   countdown, upcoming rounds close with the date. The whole card is one
   link: hovering underlines the GP name and slowly zooms the photo. ──────── */

const ORDINALS = ["th", "st", "nd", "rd"] as const;

/** 1 → "1st", 2 → "2nd", 11 → "11th". */
function ordinalSuffix(n: number): string {
  const v = n % 100;
  return ORDINALS[(v - 20) % 10] ?? ORDINALS[v] ?? ORDINALS[0];
}

/** Stepped row widths — a literal podium: the winner's row is the widest,
 *  3rd's the narrowest. */
const PODIUM_WIDTH: Record<number, string> = {
  1: "w-full",
  2: "w-[88%]",
  3: "w-[76%]",
};

/** Podium chip — position numeral, headshot in a team-colour roundel,
 *  driver code and gap. Translucent dark row so the photo shows through. */
function PodiumChip({
  position,
  code,
  gap,
  headshotPath,
  color,
}: {
  position: number;
  code: string;
  gap: string;
  headshotPath: string | null;
  color: string;
}) {
  const headshot = mediaUrl(headshotPath);
  return (
    <li
      className={`flex min-h-12 items-center gap-2 rounded-md bg-black/50 p-2 ${
        PODIUM_WIDTH[position] ?? "w-full"
      }`}
    >
      <span className="font-display min-w-5 shrink-0 font-medium uppercase leading-none text-white/85">
        <span className="text-[0.625rem]">{position}</span>
        <span className="text-[0.375rem] align-super">{ordinalSuffix(position)}</span>
      </span>
      <span
        aria-hidden
        className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full"
        style={{ backgroundColor: color }}
      >
        {headshot ? (
          <Image src={headshot} alt="" fill sizes="24px" className="object-cover object-top" />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="display-s font-medium uppercase text-white">{code}</span>
        <span className="technical-2xs truncate text-white/75">{gap}</span>
      </span>
    </li>
  );
}

export function RoundCard({
  gp,
  year,
  next = false,
}: {
  gp: ScheduleGp;
  year: number;
  /** Renders the highlighted "up next" variant (live-blue tinted scrim). */
  next?: boolean;
}) {
  const dates = formatDateRange(gp.startDate, gp.endDate);
  const cancelled = gp.status === "cancelled";
  const completed = gp.status === "completed";
  const highlight = next && !cancelled && !completed;

  const podium = completed && gp.podium?.lines.length ? gp.podium : null;
  const photoUrl = mediaUrl(gp.circuit.photoPath);

  const subtitle =
    gp.officialName ??
    [gp.circuit.name, gp.circuit.locality].filter(Boolean).join(", ");

  const eyebrow = highlight
    ? gp.status === "live"
      ? "Live now"
      : "Up next"
    : roundLabel(gp.round);

  const dateLine = dates ? (
    <span
      className={`font-digits text-base font-bold lg:text-xl ${
        cancelled ? "text-white/60 line-through" : "text-white"
      }`}
    >
      {dates}
    </span>
  ) : null;

  return (
    <Link href={`/schedule/${year}/${gp.slug}`} className="group block h-full">
      <article className="relative z-0 flex h-full min-h-75 flex-col overflow-hidden rounded-md bg-static-9 p-3 text-white md:min-h-57.5 md:p-4">
        {/* circuit photo fills the card… */}
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt=""
            fill
            sizes="(max-width: 735px) 100vw, 50vw"
            className={`card-img -z-20 object-cover ${cancelled ? "grayscale" : ""}`}
          />
        ) : null}
        {/* …under a black scrim (blue-tinted for the up-next round) that
            keeps every word on top readable in white */}
        <span
          aria-hidden
          className={`absolute inset-0 -z-10 ${
            highlight
              ? "bg-[linear-gradient(180deg,rgba(10,49,95,0.88),rgba(16,84,158,0.72)_55%,rgba(8,34,66,0.9))]"
              : "bg-[linear-gradient(180deg,rgba(0,0,0,0.68),rgba(0,0,0,0.45)_50%,rgba(0,0,0,0.78))]"
          }`}
        />

        <div className="relative flex h-full flex-col">
          {/* Eyebrow row: round number + date pill / status */}
          <div className="flex min-h-6 items-start justify-between gap-2">
            <span
              className={`body-2xs font-bold uppercase ${
                highlight ? "rounded-sm bg-live-blue px-2 py-0.5 text-white" : "text-white/80"
              }`}
            >
              {eyebrow}
            </span>
            {completed && dates ? (
              <span className="technical-xs inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-black/50 px-2.5 py-1 text-white/90">
                <span aria-hidden>&#127937;</span>
                {dates}
              </span>
            ) : cancelled ? (
              <StatusChip status="cancelled" />
            ) : !highlight && gp.status === "live" ? (
              <StatusChip status="live" />
            ) : null}
          </div>

          {/* Flag + GP name */}
          <h3 className="mt-1 flex items-center gap-3">
            <CountryFlag code={gp.circuit.countryCode} className="text-xl leading-none" />
            <span
              className={`display-xl font-medium group-hover:underline ${
                cancelled ? "text-white/60 line-through" : ""
              }`}
            >
              {gp.name}
            </span>
          </h3>

          {/* Long official title — grows so the footer sits on the baseline */}
          <p className="body-xs mt-1.5 grow font-semibold text-white/80">{subtitle}</p>

          {podium ? (
            <div className="mt-3">
              <p className="body-2xs mb-1 font-bold uppercase text-white/80">
                {`${[
                  podium.categoryShortName,
                  podium.raceNumber != null ? `Race ${podium.raceNumber}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")} podium`.trim()}
              </p>
              <ul className="flex flex-col gap-0.5">
                {podium.lines.map((line) => (
                  <PodiumChip
                    key={line.position}
                    position={line.position}
                    code={line.code}
                    gap={line.gap}
                    headshotPath={line.headshotPath}
                    color={line.teamColor ?? podium.categoryColor}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              {dateLine}
              {highlight && gp.firstRaceStartsAt ? (
                <InlineCountdown
                  targetIso={gp.firstRaceStartsAt}
                  className="body-xs font-bold text-white"
                />
              ) : null}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
