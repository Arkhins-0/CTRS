/** Shared race-time formatting helpers used by both apps. */

/** 92345 → "1:32.345" */
export function formatLapTime(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/** 5432198 → "1:30:32.198" (winner's total race time) */
export function formatRaceTime(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  return `${hours > 0 ? `${hours}:` : ""}${mm}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/** gap 5123 → "+5.123s"; lapsBehind 2 → "+2 laps" */
export function formatGap(opts: {
  position: number | null;
  status: string;
  gapMs: number | null;
  lapsBehind: number | null;
  timeMs?: number | null;
}): string {
  if (opts.status === "dnf") return "DNF";
  if (opts.status === "dns") return "DNS";
  if (opts.status === "dsq") return "DSQ";
  if (opts.status === "nc") return "NC";
  if (opts.position === 1 && opts.timeMs != null) return formatRaceTime(opts.timeMs);
  if (opts.lapsBehind) return `+${opts.lapsBehind} lap${opts.lapsBehind > 1 ? "s" : ""}`;
  if (opts.gapMs != null) return `+${(opts.gapMs / 1000).toFixed(3)}s`;
  return "—";
}

/** "1:32.345" or "92.345" → ms (parses seed/API time strings) */
export function parseTimeToMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(?:(\d+):)?(?:(\d+):)?(\d+)(?:\.(\d{1,3}))?$/);
  if (!m) return null;
  const [, a, b, secs, frac] = m;
  const millis = Number((frac ?? "0").padEnd(3, "0"));
  let total = Number(secs) * 1000 + millis;
  if (a && b) total += Number(a) * 3600000 + Number(b) * 60000;
  else if (a) total += Number(a) * 60000;
  return total;
}
