/**
 * Client-safe CSV import for the bulk results grid. Timing-sheet CSVs are
 * parsed in the browser and merged onto the existing GridRows (matched by car
 * number, driver code or driver name) — the grid stays the single source of
 * truth and the normal publish/save flow persists the result. No "@ctr/db"
 * imports here.
 */

import {
  compareRows,
  isPractice,
  isQualiLike,
  isRaceLike,
  schemePoints,
  type GridRow,
  type ResultStatus,
  type SessionKind,
} from "./types";

export type CsvImportResult = {
  rows: GridRow[];
  /** grid rows updated from the file */
  matched: number;
  /** CSV lines that matched no driver entry ("row 4 (#19 UNK)") */
  unmatched: string[];
  warnings: string[];
};

/* ── Low-level CSV parsing (quotes, CRLF, embedded commas) ───────────────── */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    // ignore fully empty lines
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\n") {
      pushRow();
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field !== "" || row.length) pushRow();
  return rows;
}

/* ── Header recognition ──────────────────────────────────────────────────── */

type Column =
  | "position"
  | "carNumber"
  | "code"
  | "name"
  | "time"
  | "gap"
  | "timeOrGap"
  | "laps"
  | "grid"
  | "status"
  | "points"
  | "fastestLap"
  | "fastestLapTime"
  | "q1"
  | "q2"
  | "q3";

const HEADER_ALIASES: Record<string, Column> = {
  pos: "position",
  position: "position",
  p: "position",
  rank: "position",
  "finishing position": "position",
  finish: "position",

  no: "carNumber",
  num: "carNumber",
  number: "carNumber",
  car: "carNumber",
  "car number": "carNumber",
  "car no": "carNumber",
  carno: "carNumber",
  "#": "carNumber",

  code: "code",
  "driver code": "code",
  abbr: "code",
  abbreviation: "code",
  tla: "code",

  driver: "name",
  name: "name",
  "driver name": "name",
  competitor: "name",

  time: "time",
  "best lap": "time",
  bestlap: "time",
  "best time": "time",
  "lap time": "time",
  laptime: "time",
  "total time": "time",
  "race time": "time",

  gap: "gap",
  diff: "gap",
  interval: "gap",
  behind: "gap",

  "time gap": "timeOrGap",
  "time or gap": "timeOrGap",
  "time/gap": "timeOrGap",

  laps: "laps",
  lap: "laps",
  "laps completed": "laps",

  grid: "grid",
  "grid position": "grid",
  start: "grid",
  "start position": "grid",
  "starting position": "grid",

  status: "status",

  points: "points",
  pts: "points",
  score: "points",

  fl: "fastestLap",
  "fastest lap": "fastestLap",
  fastest: "fastestLap",

  // NB: "best lap" is deliberately absent — it already maps to "time" above,
  // which is what a practice sheet means by it.
  "fl time": "fastestLapTime",
  "fl_time": "fastestLapTime",
  "fastest lap time": "fastestLapTime",

  q1: "q1",
  "q1 time": "q1",
  q2: "q2",
  "q2 time": "q2",
  q3: "q3",
  "q3 time": "q3",
};

const normaliseHeader = (h: string): string =>
  h
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[^a-z0-9# ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

/* ── Cell coercion helpers ───────────────────────────────────────────────── */

const toInt = (raw: string): number | null => {
  const n = Number.parseInt(raw.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

const STATUS_ALIASES: Record<string, ResultStatus> = {
  finished: "finished",
  fin: "finished",
  ok: "finished",
  classified: "finished",
  dnf: "dnf",
  ret: "dnf",
  retired: "dnf",
  dns: "dns",
  "did not start": "dns",
  dsq: "dsq",
  dq: "dsq",
  disqualified: "dsq",
  excluded: "dsq",
  nc: "nc",
  "not classified": "nc",
};

const truthy = (raw: string): boolean =>
  ["1", "true", "yes", "y", "x", "fl"].includes(raw.trim().toLowerCase());

/* ── Import ──────────────────────────────────────────────────────────────── */

/**
 * Parse a timing CSV and merge it onto the current grid rows. Rows are matched
 * by car number, then driver code, then driver name; grid rows absent from the
 * file are left untouched. When the file has no position column, positions
 * follow file order. On race-like sessions points auto-fill from the scheme
 * unless the file carries a points column.
 */
export function importResultsCsv(
  text: string,
  currentRows: GridRow[],
  sessionType: SessionKind,
  scheme: readonly number[],
): CsvImportResult | { error: string } {
  const parsed = parseCsv(text);
  if (parsed.length < 2) return { error: "The file needs a header row plus at least one data row." };

  const headers = parsed[0].map((h) => HEADER_ALIASES[normaliseHeader(h)] ?? null);
  const col = (c: Column): number => headers.indexOf(c);
  if (col("carNumber") === -1 && col("code") === -1 && col("name") === -1) {
    return {
      error:
        'No driver column recognised — the header row needs "car_number", "driver_code" or "driver_name".',
    };
  }

  const raceLike = isRaceLike(sessionType);
  const qualiLike = isQualiLike(sessionType);
  const practice = isPractice(sessionType);
  // In practice sheets a "fastest lap" column is the lap time, not the FL flag.
  const timeIdx = col("time") !== -1 ? col("time") : practice ? col("fastestLap") : -1;
  const hasPositions = col("position") !== -1;
  const hasPoints = col("points") !== -1;

  const byNumber = new Map(currentRows.map((r) => [r.carNumber, r.entryId]));
  const byCode = new Map(currentRows.map((r) => [r.driverCode.toUpperCase(), r.entryId]));
  const byName = new Map(currentRows.map((r) => [r.driverName.toLowerCase(), r.entryId]));

  const cellAt = (cells: string[], c: Column): string => {
    const i = col(c);
    return i === -1 ? "" : (cells[i] ?? "").trim();
  };

  const patches = new Map<string, Partial<GridRow>>();
  const unmatched: string[] = [];
  const warnings: string[] = [];
  let order = 0;

  for (let line = 1; line < parsed.length; line++) {
    const cells = parsed[line];

    const num = col("carNumber") === -1 ? null : toInt(cellAt(cells, "carNumber"));
    const code = cellAt(cells, "code").toUpperCase();
    const name = cellAt(cells, "name").toLowerCase();
    const entryId =
      (num != null ? byNumber.get(num) : undefined) ??
      (code ? byCode.get(code) : undefined) ??
      (name ? byName.get(name) : undefined);
    if (!entryId) {
      const label = [num != null ? `#${num}` : "", code || name].filter(Boolean).join(" ");
      unmatched.push(`row ${line + 1}${label ? ` (${label})` : ""}`);
      continue;
    }
    if (patches.has(entryId)) {
      warnings.push(`row ${line + 1} duplicates an earlier driver — the later row wins.`);
    }
    order += 1;

    const patch: Partial<GridRow> = {
      position: hasPositions ? toInt(cellAt(cells, "position")) : order,
    };

    let status: ResultStatus = "finished";
    const statusRaw = cellAt(cells, "status");
    if (statusRaw) {
      const mapped = STATUS_ALIASES[statusRaw.toLowerCase()];
      if (mapped) status = mapped;
      else warnings.push(`row ${line + 1}: unknown status "${statusRaw}" — kept "finished".`);
    }

    const timeRaw = timeIdx === -1 ? "" : (cells[timeIdx] ?? "").trim();
    const gapRaw = cellAt(cells, "gap") || cellAt(cells, "timeOrGap");

    if (raceLike) {
      patch.status = status;
      patch.gridPosition = toInt(cellAt(cells, "grid"));
      patch.laps = toInt(cellAt(cells, "laps"));
      // Winner carries the total time; everyone else a gap. A single
      // "time_or_gap" (or lone "time") column serves both roles.
      const combined = timeRaw || gapRaw;
      if (patch.position === 1) {
        patch.timeText = combined;
        patch.gapText = "";
      } else {
        patch.timeText = "";
        patch.gapText = gapRaw || timeRaw;
      }
      patch.points = hasPoints
        ? (Number.parseFloat(cellAt(cells, "points")) || 0)
        : schemePoints(scheme, patch.position ?? null, status);
      /*
       * Timing exports write the FL column two ways: a flag ("x", "1") or
       * the lap itself ("1:31.204"). Accept both — a value that is not a
       * recognised flag but does look like a time means "fastest lap, and
       * here it is". A dedicated FL-time column always wins.
       */
      const flRaw = col("fastestLap") === -1 ? "" : cellAt(cells, "fastestLap");
      const flTimeRaw = cellAt(cells, "fastestLapTime");
      const flIsTime = Boolean(flRaw) && !truthy(flRaw) && /\d[:.]\d/.test(flRaw);
      patch.fastestLap = truthy(flRaw) || flIsTime || Boolean(flTimeRaw);
      patch.fastestLapText = flTimeRaw || (flIsTime ? flRaw : "");
    } else if (qualiLike) {
      patch.status = status;
      patch.q1Text = cellAt(cells, "q1");
      patch.q2Text = cellAt(cells, "q2");
      patch.q3Text = cellAt(cells, "q3");
    } else {
      patch.status = status;
      patch.timeText = timeRaw;
      patch.laps = toInt(cellAt(cells, "laps"));
    }

    patches.set(entryId, patch);
  }

  if (!patches.size) {
    return { error: "No CSV row matched a driver in this session's entry list." };
  }

  let rows = currentRows.map((r) => {
    const patch = patches.get(r.entryId);
    return patch ? { ...r, ...patch } : r;
  });

  // fastest lap is exclusive — keep only the best-placed flagged row
  if (raceLike) {
    const flagged = rows.filter((r) => r.fastestLap).sort(compareRows);
    if (flagged.length > 1) {
      warnings.push("Multiple fastest-lap rows in the file — kept the best-classified one.");
      rows = rows.map((r) => {
        const isIt = r.entryId === flagged[0].entryId;
        return { ...r, fastestLap: isIt, fastestLapText: isIt ? r.fastestLapText : "" };
      });
    }
  }

  return {
    rows: [...rows].sort(compareRows),
    matched: patches.size,
    unmatched,
    warnings,
  };
}

/* ── Template ────────────────────────────────────────────────────────────── */

const csvEscape = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** A ready-to-fill template CSV for this session, pre-seeded with the entry list. */
export function buildTemplateCsv(rows: GridRow[], sessionType: SessionKind): string {
  const fixed = ["position", "car_number", "driver_code", "driver_name"];
  const extra = isRaceLike(sessionType)
    ? ["grid", "laps", "time_or_gap", "status", "points", "fastest_lap"]
    : isQualiLike(sessionType)
      ? ["q1", "q2", "q3"]
      : ["time", "laps"];
  const header = [...fixed, ...extra].join(",");
  const lines = rows.map((r) =>
    [
      r.position ?? "",
      r.carNumber,
      csvEscape(r.driverCode),
      csvEscape(r.driverName),
      ...extra.map(() => ""),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}
