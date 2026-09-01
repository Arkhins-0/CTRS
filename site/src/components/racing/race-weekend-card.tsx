import Image from "next/image";
import Link from "next/link";
import { CountryFlag } from "@ctr/ui";
import { mediaUrl } from "@/lib/media";
import { StatusChip } from "./category-ui";
import { InlineCountdown } from "./countdown";
import type { ScheduleGp } from "./data";
import { formatDateRange } from "./meta";

/* ── Season-calendar card (F1 schedule grid, variants B/C/D) ───────────────
   One flat card per round on the warm band. Completed rounds show the
   flagship-category podium, the next round fills solid live-blue with a
   countdown, upcoming rounds show the date plus the circuit map (or a photo
   strip). The whole card is one link: hovering underlines the GP name and
   zooms the photo. ───────────────────────────────────────────────────────── */

const ORDINALS = ["th", "st", "nd", "rd"] as const;

/** 1 → "1st", 2 → "2nd", 11 → "11th". */
function ordinalSuffix(n: number): string {
  const v = n % 100;
  return ORDINALS[(v - 20) % 10] ?? ORDINALS[v] ?? ORDINALS[0];
}

/** Stepped row widths — a literal podium: the winner's row is the widest,
 *  3rd's the narrowest, and the freed corner holds the circuit map. */
const PODIUM_WIDTH: Record<number, string> = {
  1: "w-full",
  2: "w-[88%]",
  3: "w-[76%]",
};

/** Podium chip — position numeral, headshot in a team-colour roundel,
 *  driver code and gap. */
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
      className={`flex min-h-12 items-center gap-2 rounded-md bg-surface-3 p-2 ${
        PODIUM_WIDTH[position] ?? "w-full"
      }`}
    >
      <span className="font-display min-w-5 shrink-0 font-medium uppercase leading-none text-text-4">
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
        <span className="display-s font-medium uppercase text-text-5">{code}</span>
        <span className="technical-2xs truncate text-text-3">{gap}</span>
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
  /** Renders the highlighted "up next" variant (solid live blue). */
  next?: boolean;
}) {
  const dates = formatDateRange(gp.startDate, gp.endDate);
  const cancelled = gp.status === "cancelled";
  const completed = gp.status === "completed";
  const highlight = next && !cancelled && !completed;

  const podium = completed && gp.podium?.lines.length ? gp.podium : null;
  // Every variant carries the circuit map — no card is left imageless.
  const mapUrl = mediaUrl(gp.circuit.mapPath);
  const photoUrl = !completed && !highlight && !mapUrl ? mediaUrl(gp.circuit.photoPath) : null;

  const subtitle =
    gp.officialName ??
    [gp.circuit.name, gp.circuit.locality].filter(Boolean).join(", ");

  const eyebrow = highlight
    ? gp.status === "live"
      ? "Live now"
      : "Up next"
    : `Round ${gp.round}`;

  const dateLine = dates ? (
    <span
      className={`font-digits text-base font-bold lg:text-xl ${
        cancelled ? "text-text-3 line-through" : ""
      }`}
    >
      {dates}
    </span>
  ) : null;

  return (
    <Link href={`/schedule/${year}/${gp.slug}`} className="group block h-full">
      <article
        className={`relative z-0 flex h-full min-h-75 flex-col overflow-hidden rounded-md p-3 md:min-h-57.5 md:p-4 ${
          highlight ? "bg-live-blue text-white" : "bg-surface-1 text-text-5"
        }`}
      >
        {/* Decorative chequer wash behind the highlight card */}
        {highlight ? (
          <span
            aria-hidden
            className="chequer absolute inset-y-0 left-1/2 right-0 z-0 text-black opacity-15 transition-opacity duration-300 group-hover:opacity-30"
          />
        ) : null}

        <div className="relative z-10 flex h-full flex-col">
          {/* Eyebrow row: round number + date pill / status */}
          <div className="flex min-h-6 items-start justify-between gap-2">
            <span
              className={`body-2xs font-bold uppercase ${
                highlight ? "text-white" : "text-text-3"
              }`}
            >
              {eyebrow}
            </span>
            {completed && dates ? (
              <span className="technical-xs inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-surface-3 px-2.5 py-1 text-text-4">
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
                cancelled ? "text-text-3 line-through" : ""
              }`}
            >
              {gp.name}
            </span>
          </h3>

          {/* Long official title — grows so the footer sits on the baseline */}
          <p
            className={`body-xs mt-1.5 grow font-semibold ${
              highlight ? "text-white/85" : "text-text-3"
            }`}
          >
            {subtitle}
          </p>

          {podium ? (
            <div className="relative mt-3">
              {/* the circuit map sits in the staircase corner the stepped
                  rows free up */}
              {mapUrl ? (
                <Image
                  aria-hidden
                  src={mapUrl}
                  alt=""
                  width={240}
                  height={100}
                  className="pointer-events-none absolute bottom-1 right-0 z-0 h-20 w-auto max-w-[36%] object-contain object-right-bottom opacity-90"
                />
              ) : null}
              <p className="body-2xs mb-1 font-bold uppercase text-text-3">
                {podium.categoryShortName ? `${podium.categoryShortName} podium` : "Podium"}
              </p>
              <ul className="relative z-10 flex flex-col gap-0.5">
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
          ) : highlight ? (
            <>
              {mapUrl ? (
                <span className="my-2 flex flex-1 items-center justify-center">
                  {/* black line art flattened to a white silhouette so the
                      map holds on the solid live-blue card */}
                  <Image
                    src={mapUrl}
                    alt={`${gp.circuit.name} track map`}
                    width={240}
                    height={100}
                    className="h-24 w-auto max-w-[70%] object-contain brightness-0 invert opacity-90 md:h-28"
                  />
                </span>
              ) : null}
              <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                {dateLine}
                {gp.firstRaceStartsAt ? (
                  <InlineCountdown
                    targetIso={gp.firstRaceStartsAt}
                    className="body-xs font-bold text-white"
                  />
                ) : null}
              </div>
            </>
          ) : mapUrl ? (
            <div className="mt-3 flex items-end justify-between gap-3">
              {dateLine}
              <Image
                src={mapUrl}
                alt={`${gp.circuit.name} track map`}
                width={240}
                height={100}
                className="h-25 w-auto max-w-[50%] object-contain"
              />
            </div>
          ) : photoUrl ? (
            <div className="mt-3 flex flex-col gap-3">
              {dateLine}
              <span className="block overflow-hidden rounded-sm">
                <Image
                  src={photoUrl}
                  alt={gp.circuit.name}
                  width={600}
                  height={200}
                  className="card-img max-h-28 w-full object-cover"
                />
              </span>
            </div>
          ) : (
            <div className="mt-3">{dateLine}</div>
          )}
        </div>
      </article>
    </Link>
  );
}
