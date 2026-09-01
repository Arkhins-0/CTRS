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
  "race2",
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export function isSessionType(value: string): value is SessionType {
  return (SESSION_TYPES as readonly string[]).includes(value);
}

/** Fallback labels only — INCRC sessions carry a `label` ("ISC — Race 1")
 *  which always wins. fp1 renders as plain "Practice" for this championship. */
export const SESSION_LABELS: Record<SessionType, string> = {
  fp1: "Practice",
  fp2: "Practice 2",
  fp3: "Practice 3",
  sprint_qualifying: "Sprint Qualifying",
  sprint: "Sprint",
  qualifying: "Qualifying",
  race: "Race",
  race2: "Race 2", // retired enum value — never seeded, kept for type-completeness
};

/** Prefer the session's own display label everywhere; fall back to the type
 *  (plus the sequence for Race 2 / Race 3 of a multi-race round). */
export function sessionDisplayLabel(session: {
  type: SessionType;
  label?: string | null;
  sequence?: number;
}): string {
  const label = session.label?.trim();
  if (label) return label;
  const base = SESSION_LABELS[session.type];
  return session.sequence && session.sequence > 1 ? `${base} ${session.sequence}` : base;
}

/** Chronological weekend order — used to sort timetables and to show results
 *  newest-first (Race 2 → Race 1 → Qualifying → Practice). */
export const SESSION_ORDER: Record<SessionType, number> = {
  fp1: 0,
  fp2: 1,
  fp3: 2,
  sprint_qualifying: 3,
  sprint: 4,
  qualifying: 5,
  race: 6,
  race2: 7,
};

export type ResultsTableKind = "race" | "qualifying" | "practice";

export function resultsTableKind(type: SessionType): ResultsTableKind {
  if (type === "race" || type === "race2" || type === "sprint") return "race";
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

/** "2026-09-11" + "2026-09-13" → "11–13 Sep 2026" (or spans months/years). */
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

/* ── Timetable day grouping (IST — the championship's home timezone) ─────── */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Calendar day key ("YYYY-MM-DD") of an ISO timestamp in IST. Deterministic
 *  regardless of server timezone, so it is safe in server components. */
export function istDateKey(iso: string): string {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** "2026-09-11" → "Friday" (timezone-safe: date-only parse). */
export function weekdayName(dateKey: string): string {
  return format(parseISO(dateKey), "EEEE");
}

/** "Round 3" — except round 0, which is the pre-season test weekend, not a
 *  championship round, and must never print as the nonsensical "Round 0". */
export function roundLabel(round: number): string {
  return round > 0 ? `Round ${round}` : "Pre-Season";
}
