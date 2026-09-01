import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { formatGap, formatLapTime } from "@ctr/db";
import { CountryFlag } from "@ctr/ui";
import { StatusChip } from "./category-ui";
import type { ClassificationRow, SeasonRoundRow } from "./data";
import { formatDate, resultsTableKind, type SessionType } from "./meta";

/* ── F1 results-table primitives (spec §2.5) ───────────────────────────────
   White rounded-md card on the beige hub surface; 14px uppercase muted thead
   over a 2px rule; 56px body rows split by 1px dividers; 16px Titillium
   semibold cells; first column flush-left, last column flush-right; the
   whole table x-scrolls (with th snap points) inside the card on mobile.
   Shared by the season race-results list and the classification tables. ──── */

export const resultsTh =
  "body-xs snap-start scroll-ml-6 whitespace-nowrap py-4 pl-1 pr-6 text-left align-top font-semibold uppercase md:scroll-ml-12 md:pr-12";
export const resultsThEnd =
  "body-xs whitespace-nowrap py-4 pl-1 pr-1 text-right align-top font-semibold uppercase";
export const resultsTd =
  "body-s whitespace-nowrap py-4 pl-1 pr-6 font-semibold md:pr-12";
export const resultsTdEnd =
  "body-s whitespace-nowrap py-4 pl-1 pr-1 text-right font-semibold";

/** thead row: 2px #aaa rule + muted uppercase labels. */
export const resultsTheadRow = "border-b-2 border-surface-6 text-text-3";
/** tbody row: 1px divider under every row but the last. */
export const resultsBodyRow = "border-b border-surface-4 last:border-0";

/** White rounded-md card with the spec's combined gutters + mobile x-scroll. */
export function ResultsTableCard({
  children,
  footer,
}: {
  children: React.ReactNode;
  /** Sits inside the card but outside the scroller, so a caption stays put
   *  when a wide table is scrolled sideways on mobile. */
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-surface-1 px-12 py-8 md:px-16 md:py-10 lg:py-12">
      <div className="snap-x overflow-x-auto">{children}</div>
      {footer}
    </div>
  );
}

/* ── Filter-row dropdown (spec §2.3, stroke-medium skin) ─────────────────────
   Native-details recipe shared by the two results pages: black-stroke pill
   trigger, bordered menu of links, brand dot on the current item. Server-only
   (mirrors SeasonDropdown's classes in results-hub.tsx). ──────────────────── */

export type FilterOption = {
  key: string;
  label: React.ReactNode;
  href: string;
  active?: boolean;
};

export function FilterDropdown({
  label,
  options,
  ariaLabel,
}: {
  label: React.ReactNode;
  options: FilterOption[];
  ariaLabel?: string;
}) {
  return (
    <details className="relative max-md:w-full">
      <summary
        aria-label={ariaLabel}
        className="btn btn-md btn-stroke cursor-pointer select-none list-none max-md:w-full [&::-webkit-details-marker]:hidden"
      >
        {label}
        <ChevronDown size={16} aria-hidden />
      </summary>
      <div className="absolute left-0 z-30 mt-3 max-h-[50vh] min-w-52 overflow-y-auto rounded-md border-2 border-text-5 bg-surface-1 p-1">
        {options.map((o) => (
          <Link
            key={o.key}
            href={o.href}
            aria-current={o.active ? "page" : undefined}
            className="body-s m-1 flex items-center gap-2 whitespace-nowrap rounded-md p-2 font-semibold text-text-5 hover:bg-black/10"
          >
            {o.label}
            {o.active ? (
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            ) : null}
          </Link>
        ))}
      </div>
    </details>
  );
}

/* ── Season race-results list (spec §4.2, adapted to SeasonRoundRow) ───────
   Our round rows carry no winner data, so the columns are Grand Prix · Date ·
   Circuit · Status plus a right-flushed results affordance. Rounds without
   results render muted and link to the schedule page instead. ─────────────── */

export function SeasonRoundsTable({
  year,
  rounds,
}: {
  year: number;
  rounds: SeasonRoundRow[];
}) {
  return (
    <ResultsTableCard>
      <table className="w-full">
        <thead>
          <tr className={resultsTheadRow}>
            <th scope="col" className={resultsTh}>
              Grand Prix
            </th>
            <th scope="col" className={resultsTh}>
              Date
            </th>
            <th scope="col" className={resultsTh}>
              Circuit
            </th>
            <th scope="col" className={resultsTh}>
              Status
            </th>
            <th scope="col" className={resultsThEnd}>
              <span className="sr-only">Results</span>
            </th>
          </tr>
        </thead>
        <tbody className="text-text-5">
          {rounds.map((r) => {
            const href = r.hasResults
              ? `/results/${year}/${r.slug}`
              : `/schedule/${year}/${r.slug}`;
            return (
              <tr
                key={r.id}
                className={`${resultsBodyRow}${r.hasResults ? "" : " text-text-3"}`}
              >
                <td className={resultsTd}>
                  <Link href={href} className="flex items-center gap-2.5 hover:underline">
                    <CountryFlag code={r.countryCode} className="text-xl leading-none" />
                    {r.name}
                  </Link>
                </td>
                <td className={resultsTd}>
                  {formatDate(r.endDate ?? r.startDate, "dd MMM")}
                </td>
                <td className={resultsTd}>
                  {r.circuitName}
                  {r.locality ? `, ${r.locality}` : ""}
                </td>
                <td className={resultsTd}>
                  <StatusChip status={r.status} />
                </td>
                <td className={resultsTdEnd}>
                  {r.hasResults ? (
                    <Link
                      href={`/results/${year}/${r.slug}`}
                      className="whitespace-nowrap font-bold hover:text-brand"
                    >
                      Results <span aria-hidden>→</span>
                    </Link>
                  ) : r.status === "cancelled" ? (
                    "—"
                  ) : (
                    "Scheduled"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ResultsTableCard>
  );
}

/* ── Cell primitives (spec §2.6) ─────────────────────────────────────────── */

/** DNF/DNS rows show "NC" (not classified) in the Pos column, DSQ shows "DQ". */
const STATUS_POS: Partial<Record<ClassificationRow["status"], string>> = {
  dnf: "NC",
  dns: "NC",
  nc: "NC",
  dsq: "DQ",
};

const STATUS_SHORT: Partial<Record<ClassificationRow["status"], string>> = {
  dnf: "DNF",
  dns: "DNS",
  dsq: "DSQ",
  nc: "NC",
};

/** 20px team-colour disc + responsive name: First Last → Last → code. */
function DriverChip({ row }: { row: ClassificationRow }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="h-5 w-5 shrink-0 rounded-full"
        style={{ backgroundColor: row.team.color }}
      />
      <span className="whitespace-nowrap">
        <span className="max-lg:hidden">{row.driver.firstName}&nbsp;</span>
        <span className="max-md:hidden">{row.driver.lastName}</span>
        <span className="md:hidden">{row.driver.code}</span>
      </span>
    </span>
  );
}

/** 20px team-colour disc + team short name. */
function TeamChip({ team }: { team: { shortName: string; color: string } }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className="h-5 w-5 shrink-0 rounded-full"
        style={{ backgroundColor: team.color }}
      />
      {team.shortName}
    </span>
  );
}

/** Practice "Time / Gap" cell: leader's lap time, then "+2.974s" gaps. */
function lapTimeOrGap(row: ClassificationRow, leaderMs: number | null): string {
  if (row.status !== "finished") return STATUS_SHORT[row.status] ?? "—";
  if (row.position === 1 || leaderMs == null) return formatLapTime(row.timeMs);
  if (row.gapMs != null) return `+${(row.gapMs / 1000).toFixed(3)}s`;
  if (row.timeMs != null && row.timeMs >= leaderMs) {
    return `+${((row.timeMs - leaderMs) / 1000).toFixed(3)}s`;
  }
  return formatLapTime(row.timeMs);
}

/**
 * Session classification table (spec §5.3). Column set adapts to the session
 * kind: race → Laps + Time/Retired + Pts · qualifying → Q1/Q2/Q3 · practice
 * → Time/Gap + Laps. Rows must already be ordered (position, nulls last).
 */
export function ResultsTable({
  rows,
  sessionType,
}: {
  rows: ClassificationRow[];
  sessionType: SessionType;
}) {
  const kind = resultsTableKind(sessionType);
  const leaderMs = rows[0] ? (rows[0].timeMs ?? rows[0].q1TimeMs) : null;

  /*
   * The tinted cell says WHO set the fastest lap; this caption is the only
   * place the lap itself is readable. Shown whenever the flag is set, even
   * with no time recorded yet, so the tint is never unexplained.
   */
  const fastest = rows.find((r) => r.fastestLap);

  return (
    <ResultsTableCard
      footer={
        fastest ? (
          <p className="body-xs mt-6 flex flex-wrap items-baseline gap-x-2 text-text-3">
            <span className="font-semibold uppercase text-brand">Fastest lap</span>
            <span className="font-semibold text-text-5">
              {fastest.driver.firstName} {fastest.driver.lastName}
            </span>
            {fastest.fastestLapTimeMs != null ? (
              <span className="font-semibold text-text-5">
                {formatLapTime(fastest.fastestLapTimeMs)}
              </span>
            ) : null}
            <span>{fastest.team.shortName}</span>
          </p>
        ) : null
      }
    >
      <table className="w-full">
        <thead>
          <tr className={resultsTheadRow}>
            <th scope="col" className={resultsTh}>
              Pos.
            </th>
            <th scope="col" className={resultsTh}>
              No.
            </th>
            <th scope="col" className={resultsTh}>
              Driver
            </th>
            <th scope="col" className={resultsTh}>
              Team
            </th>
            {kind === "race" ? (
              <>
                <th scope="col" className={resultsTh}>
                  Laps
                </th>
                <th scope="col" className={resultsTh}>
                  Time / Retired
                </th>
                <th scope="col" className={resultsThEnd}>
                  Pts.
                </th>
              </>
            ) : kind === "qualifying" ? (
              <>
                <th scope="col" className={resultsTh}>
                  Q1
                </th>
                <th scope="col" className={resultsTh}>
                  Q2
                </th>
                <th scope="col" className={resultsThEnd}>
                  Q3
                </th>
              </>
            ) : (
              <>
                <th scope="col" className={resultsTh}>
                  Time / Gap
                </th>
                <th scope="col" className={resultsThEnd}>
                  Laps
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="text-text-5">
          {rows.map((row) => (
            <tr key={row.id} className={resultsBodyRow}>
              <td className={resultsTd}>
                {row.position ?? STATUS_POS[row.status] ?? "NC"}
              </td>
              <td className={resultsTd}>{row.carNumber}</td>
              <td className={resultsTd}>
                <DriverChip row={row} />
              </td>
              <td className={resultsTd}>
                <TeamChip team={row.team} />
              </td>
              {kind === "race" ? (
                <>
                  <td className={resultsTd}>{row.laps ?? "—"}</td>
                  <td className={`${resultsTd}${row.fastestLap ? " text-brand" : ""}`}>
                    {formatGap({
                      position: row.position,
                      status: row.status,
                      gapMs: row.gapMs,
                      lapsBehind: row.lapsBehind,
                      timeMs: row.timeMs,
                    })}
                  </td>
                  <td className={resultsTdEnd}>{row.points}</td>
                </>
              ) : kind === "qualifying" ? (
                <>
                  <td
                    className={`${resultsTd}${row.fastestLap ? " text-brand" : ""}`}
                  >
                    {row.status === "finished"
                      ? formatLapTime(row.q1TimeMs ?? row.timeMs)
                      : (STATUS_SHORT[row.status] ?? "—")}
                  </td>
                  <td className={resultsTd}>{formatLapTime(row.q2TimeMs)}</td>
                  <td className={resultsTdEnd}>{formatLapTime(row.q3TimeMs)}</td>
                </>
              ) : (
                <>
                  <td
                    className={`${resultsTd}${row.fastestLap ? " text-brand" : ""}`}
                  >
                    {lapTimeOrGap(row, leaderMs)}
                  </td>
                  <td className={resultsTdEnd}>{row.laps ?? "—"}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </ResultsTableCard>
  );
}
