/**
 * Shared, client-safe types for the bulk results grid. No "@ctr/db" imports
 * here — this module is used by both the client grid and the server actions.
 */

/** "race2" is retired — a second race is type "race" with sequence 2. */
export type SessionKind =
  | "fp1"
  | "fp2"
  | "fp3"
  | "sprint_qualifying"
  | "sprint"
  | "qualifying"
  | "race";

export type ResultStatus = "finished" | "dnf" | "dns" | "dsq" | "nc";

export const RESULT_STATUSES: readonly ResultStatus[] = ["finished", "dnf", "dns", "dsq", "nc"];

/** One editable classification row (display info + form state, JSON-serialisable). */
export type GridRow = {
  entryId: string; // driverSeasonEntries.id
  // fixed display columns
  carNumber: number;
  driverName: string;
  driverCode: string;
  teamName: string;
  teamColor: string;
  // editable fields
  position: number | null;
  gridPosition: number | null;
  laps: number | null;
  /** winner's total race time ("1:26:33.291") or best lap in practice ("1:26.204") */
  timeText: string;
  /** gap to winner: "+5.848" (seconds) or "+2 laps" */
  gapText: string;
  q1Text: string;
  q2Text: string;
  q3Text: string;
  status: ResultStatus;
  points: number;
  fastestLap: boolean;
};

/** Race 1/2/3 are all type "race" (any sequence); sprint also pays points. */
export const isRaceLike = (t: SessionKind): boolean => t === "race" || t === "sprint";
export const isQualiLike = (t: SessionKind): boolean =>
  t === "qualifying" || t === "sprint_qualifying";
export const isPractice = (t: SessionKind): boolean => t === "fp1" || t === "fp2" || t === "fp3";

/** Stable row order: classified positions first, then unclassified by car number. */
export function compareRows(a: GridRow, b: GridRow): number {
  if (a.position == null && b.position == null) return a.carNumber - b.carNumber;
  if (a.position == null) return 1;
  if (b.position == null) return -1;
  if (a.position !== b.position) return a.position - b.position;
  return a.carNumber - b.carNumber;
}

/** Points a position is worth under a scheme, mirroring pointsForPosition server-side. */
export function schemePoints(
  scheme: readonly number[],
  position: number | null,
  status: ResultStatus,
): number {
  if (status !== "finished" || !position || position < 1 || position > scheme.length) return 0;
  return scheme[position - 1] ?? 0;
}

/** True when the editor entered anything at all for this row. */
export function isRowTouched(row: GridRow): boolean {
  return (
    row.position != null ||
    row.gridPosition != null ||
    row.laps != null ||
    row.status !== "finished" ||
    row.points !== 0 ||
    row.fastestLap ||
    [row.timeText, row.gapText, row.q1Text, row.q2Text, row.q3Text].some((t) => t.trim() !== "")
  );
}
