import { format, parseISO } from "date-fns";

/* ── Session types ───────────────────────────────────────────────────────── */

export const SESSION_TYPES = [
  "fp1",
  "fp2",
  "fp3",
  "sprint_qualifying",
  "sprint",
  "qualifying",
  "race",
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export function isSessionType(value: string): value is SessionType {
  return (SESSION_TYPES as readonly string[]).includes(value);
}

export const SESSION_LABELS: Record<SessionType, string> = {
  fp1: "Practice 1",
  fp2: "Practice 2",
  fp3: "Practice 3",
  sprint_qualifying: "Sprint Qualifying",
  sprint: "Sprint",
  qualifying: "Qualifying",
  race: "Race",
};

export const SESSION_SHORT_LABELS: Record<SessionType, string> = {
  fp1: "FP1",
  fp2: "FP2",
  fp3: "FP3",
  sprint_qualifying: "SQ",
  sprint: "Sprint",
  qualifying: "Quali",
  race: "Race",
};

/** Chronological weekend order — used to sort timetables/tabs and to pick the
 *  "latest" session that already has results. */
export const SESSION_ORDER: Record<SessionType, number> = {
  fp1: 0,
  fp2: 1,
  fp3: 2,
  sprint_qualifying: 3,
  sprint: 4,
  qualifying: 5,
  race: 6,
};

export type ResultsTableKind = "race" | "qualifying" | "practice";

export function resultsTableKind(type: SessionType): ResultsTableKind {
  if (type === "race" || type === "sprint") return "race";
  if (type === "qualifying" || type === "sprint_qualifying") return "qualifying";
  return "practice";
}

/* ── Driver season entry helpers ─────────────────────────────────────────── */

/** fromRound null = from round 1, toRound null = to season end. */
export function isEntryActiveAtRound(
  entry: { fromRound: number | null; toRound: number | null },
  round: number,
): boolean {
  return (entry.fromRound ?? 1) <= round && (entry.toRound == null || entry.toRound >= round);
}

/* ── Date helpers (date columns are "YYYY-MM-DD" strings) ────────────────── */

export function formatDate(value: string | null | undefined, pattern = "d MMM yyyy"): string {
  if (!value) return "—";
  return format(parseISO(value), pattern);
}

/** "2026-03-13" + "2026-03-15" → "13–15 Mar 2026" (or spans months/years). */
export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  if (!start || !end || start === end) return formatDate(start ?? end);
  const s = parseISO(start);
  const e = parseISO(end);
  if (format(s, "yyyy-MM") === format(e, "yyyy-MM")) {
    return `${format(s, "d")}–${format(e, "d MMM yyyy")}`;
  }
  if (format(s, "yyyy") === format(e, "yyyy")) {
    return `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`;
  }
  return `${format(s, "d MMM yyyy")} – ${format(e, "d MMM yyyy")}`;
}
