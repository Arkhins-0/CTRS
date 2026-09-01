"use client";

import { useRef, useState } from "react";
import {
  compareRows,
  isPractice,
  isQualiLike,
  isRaceLike,
  schemePoints,
  RESULT_STATUSES,
  type GridRow,
  type SessionKind,
} from "./types";
import { buildTemplateCsv, importResultsCsv } from "./csv-import";

const cell = "px-2 py-1.5 align-middle";
const inputBase =
  "w-full border border-line bg-surface px-2 py-1 text-sm text-fg outline-none focus:border-f1-red";

function NumberInput({
  value,
  onChange,
  onBlur,
  min,
  max,
  step,
  className = "",
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  step?: number | string;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <input
      type="number"
      aria-label={ariaLabel}
      className={`${inputBase} ${className}`}
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? null : Number(raw));
      }}
      onBlur={onBlur}
    />
  );
}

export function ResultsGrid({
  sessionType,
  initialRows,
  racePoints,
  sprintPoints,
}: {
  sessionType: SessionKind;
  initialRows: GridRow[];
  racePoints: number[];
  sprintPoints: number[];
}) {
  const [rows, setRows] = useState<GridRow[]>(initialRows);
  const [importNote, setImportNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const raceLike = isRaceLike(sessionType);
  const qualiLike = isQualiLike(sessionType);
  const practice = isPractice(sessionType);
  const scheme = sessionType === "sprint" ? sprintPoints : racePoints;

  const patchRow = (entryId: string, patch: Partial<GridRow>) =>
    setRows((prev) => prev.map((r) => (r.entryId === entryId ? { ...r, ...patch } : r)));

  /** POS / STATUS changes on race & sprint auto-fill points (still editable). */
  const patchWithAutoPoints = (row: GridRow, patch: Partial<GridRow>) => {
    const next = { ...row, ...patch };
    if (raceLike) next.points = schemePoints(scheme, next.position, next.status);
    patchRow(row.entryId, next);
  };

  const sortByPosition = () => setRows((prev) => [...prev].sort(compareRows));

  const fillPositions = () =>
    setRows((prev) =>
      prev.map((r, i) => ({
        ...r,
        position: i + 1,
        points: raceLike ? schemePoints(scheme, i + 1, r.status) : r.points,
      })),
    );

  const reapplyPoints = () =>
    setRows((prev) => prev.map((r) => ({ ...r, points: schemePoints(scheme, r.position, r.status) })));

  /** Exactly one row holds the flag; clearing it also drops its time, so a
   *  stale lap can't linger on a row that no longer claims the fastest lap. */
  const setFastestLap = (entryId: string, checked: boolean) =>
    setRows((prev) =>
      prev.map((r) => {
        const isIt = checked && r.entryId === entryId;
        return { ...r, fastestLap: isIt, fastestLapText: isIt ? r.fastestLapText : "" };
      }),
    );

  const importCsvFile = async (file: File) => {
    try {
      const outcome = importResultsCsv(await file.text(), rows, sessionType, scheme);
      if ("error" in outcome) {
        setImportNote({ tone: "error", text: outcome.error });
        return;
      }
      setRows(outcome.rows);
      const parts = [`Imported ${outcome.matched} of ${rows.length} drivers from ${file.name}.`];
      if (outcome.unmatched.length) parts.push(`No driver match for ${outcome.unmatched.join(", ")}.`);
      parts.push(...outcome.warnings);
      parts.push("Review below, then publish or save.");
      setImportNote({ tone: "ok", text: parts.join(" ") });
    } catch {
      setImportNote({ tone: "error", text: "Could not read that file — is it a plain CSV?" });
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv(rows, sessionType)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `results-template-${sessionType}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      {/* everything the surrounding <form> needs, in one field */}
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={fillPositions}
          className="chamfer-tr border border-line bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint"
        >
          Fill positions 1–{rows.length} in current order
        </button>
        {raceLike ? (
          <button
            type="button"
            onClick={reapplyPoints}
            className="chamfer-tr border border-line bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint"
          >
            Re-apply points
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="chamfer-tr border border-line bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint"
        >
          Import CSV
        </button>
        <button
          type="button"
          onClick={downloadTemplate}
          className="chamfer-tr border border-line bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-fg transition-colors hover:border-fg-faint"
        >
          CSV template
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          aria-label="Import results from a CSV file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importCsvFile(file);
            e.target.value = ""; // allow re-importing the same file
          }}
        />
        <span className="text-xs text-fg-muted">
          {raceLike
            ? 'Times: winner "1:26:33.291", gaps "+5.848" or "+2 laps". Points auto-fill from the season scheme — edit for penalties.'
            : qualiLike
              ? 'Lap times like "1:26.204". Leave blank when no lap was set.'
              : 'Best lap like "1:26.204".'}
        </span>
      </div>

      {importNote ? (
        <div
          className={`chamfer-tr mb-3 border px-3 py-2 text-xs font-bold ${
            importNote.tone === "ok"
              ? "border-emerald-600 bg-emerald-50 text-emerald-800"
              : "border-f1-red bg-surface text-f1-red"
          }`}
        >
          {importNote.text}
        </div>
      ) : null}

      <div className="chamfer-tr overflow-x-auto border border-line bg-surface shadow-sm">
        <table className="w-full min-w-760px text-sm">
          <thead>
            <tr className="border-b-2 border-line bg-panel text-left text-xs font-bold uppercase tracking-wide text-white [&>th]:px-2 [&>th]:py-2.5">
              <th className="w-16 pl-3">Pos</th>
              <th>Driver</th>
              {raceLike ? (
                <>
                  <th className="w-16">Grid</th>
                  <th className="w-16">Laps</th>
                  <th className="w-40">Time / Gap</th>
                  <th className="w-28">Status</th>
                  <th className="w-12 text-center" title="Fastest lap">
                    FL
                  </th>
                  <th className="w-28" title="Fastest lap time">
                    FL time
                  </th>
                  <th className="w-20">Pts</th>
                </>
              ) : null}
              {qualiLike ? (
                <>
                  <th className="w-28">Q1</th>
                  <th className="w-28">Q2</th>
                  <th className="w-28">Q3</th>
                </>
              ) : null}
              {practice ? (
                <>
                  <th className="w-32">Time</th>
                  <th className="w-16">Laps</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:hover]:bg-page">
            {rows.map((row) => (
              <tr key={row.entryId}>
                <td className={`${cell} pl-3`}>
                  <NumberInput
                    ariaLabel={`Position for ${row.driverName}`}
                    value={row.position}
                    min={1}
                    max={rows.length}
                    className="w-14 text-center font-black"
                    onChange={(v) => patchWithAutoPoints(row, { position: v })}
                    onBlur={sortByPosition}
                  />
                </td>
                <td className={cell}>
                  <span className="flex items-stretch gap-2">
                    <span
                      aria-hidden
                      className="w-1 shrink-0 rounded-sm"
                      style={{ backgroundColor: row.teamColor, minHeight: "1.4em" }}
                    />
                    <span className="flex items-baseline gap-2 whitespace-nowrap">
                      <span className="font-black">{row.driverCode}</span>
                      <span>{row.driverName}</span>
                      <span className="text-xs text-fg-muted">
                        #{row.carNumber} · {row.teamName}
                      </span>
                    </span>
                  </span>
                </td>

                {raceLike ? (
                  <>
                    <td className={cell}>
                      <NumberInput
                        ariaLabel={`Grid position for ${row.driverName}`}
                        value={row.gridPosition}
                        min={0}
                        max={rows.length + 5}
                        className="w-14 text-center"
                        onChange={(v) => patchRow(row.entryId, { gridPosition: v })}
                      />
                    </td>
                    <td className={cell}>
                      <NumberInput
                        ariaLabel={`Laps for ${row.driverName}`}
                        value={row.laps}
                        min={0}
                        max={200}
                        className="w-14 text-center"
                        onChange={(v) => patchRow(row.entryId, { laps: v })}
                      />
                    </td>
                    <td className={cell}>
                      {row.position === 1 ? (
                        <input
                          type="text"
                          aria-label={`Total race time for ${row.driverName}`}
                          className={`${inputBase} font-mono`}
                          placeholder="1:26:33.291"
                          value={row.timeText}
                          onChange={(e) => patchRow(row.entryId, { timeText: e.target.value })}
                        />
                      ) : (
                        <input
                          type="text"
                          aria-label={`Gap for ${row.driverName}`}
                          className={`${inputBase} font-mono`}
                          placeholder="+5.848 / +2 laps"
                          value={row.gapText}
                          onChange={(e) => patchRow(row.entryId, { gapText: e.target.value })}
                        />
                      )}
                    </td>
                    <td className={cell}>
                      <select
                        aria-label={`Status for ${row.driverName}`}
                        className={`${inputBase} uppercase`}
                        value={row.status}
                        onChange={(e) =>
                          patchWithAutoPoints(row, { status: e.target.value as GridRow["status"] })
                        }
                      >
                        {RESULT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={`${cell} text-center`}>
                      <input
                        type="checkbox"
                        aria-label={`Fastest lap for ${row.driverName}`}
                        className="size-4 accent-f1-red"
                        checked={row.fastestLap}
                        onChange={(e) => setFastestLap(row.entryId, e.target.checked)}
                      />
                    </td>
                    <td className={cell}>
                      <input
                        type="text"
                        aria-label={`Fastest lap time for ${row.driverName}`}
                        className={`${inputBase} font-mono disabled:opacity-40`}
                        placeholder="1:31.204"
                        // only the flagged row can carry a time — see setFastestLap
                        disabled={!row.fastestLap}
                        value={row.fastestLapText}
                        onChange={(e) =>
                          patchRow(row.entryId, { fastestLapText: e.target.value })
                        }
                      />
                    </td>
                    <td className={cell}>
                      <NumberInput
                        ariaLabel={`Points for ${row.driverName}`}
                        value={row.points}
                        min={0}
                        step="0.5"
                        className="w-16 text-center font-bold"
                        onChange={(v) => patchRow(row.entryId, { points: v ?? 0 })}
                      />
                    </td>
                  </>
                ) : null}

                {qualiLike ? (
                  <>
                    <td className={cell}>
                      <input
                        type="text"
                        aria-label={`Q1 time for ${row.driverName}`}
                        className={`${inputBase} font-mono`}
                        placeholder="1:26.204"
                        value={row.q1Text}
                        onChange={(e) => patchRow(row.entryId, { q1Text: e.target.value })}
                      />
                    </td>
                    <td className={cell}>
                      <input
                        type="text"
                        aria-label={`Q2 time for ${row.driverName}`}
                        className={`${inputBase} font-mono`}
                        placeholder="1:26.204"
                        value={row.q2Text}
                        onChange={(e) => patchRow(row.entryId, { q2Text: e.target.value })}
                      />
                    </td>
                    <td className={cell}>
                      <input
                        type="text"
                        aria-label={`Q3 time for ${row.driverName}`}
                        className={`${inputBase} font-mono`}
                        placeholder="1:26.204"
                        value={row.q3Text}
                        onChange={(e) => patchRow(row.entryId, { q3Text: e.target.value })}
                      />
                    </td>
                  </>
                ) : null}

                {practice ? (
                  <>
                    <td className={cell}>
                      <input
                        type="text"
                        aria-label={`Best lap for ${row.driverName}`}
                        className={`${inputBase} font-mono`}
                        placeholder="1:26.204"
                        value={row.timeText}
                        onChange={(e) => patchRow(row.entryId, { timeText: e.target.value })}
                      />
                    </td>
                    <td className={cell}>
                      <NumberInput
                        ariaLabel={`Laps for ${row.driverName}`}
                        value={row.laps}
                        min={0}
                        max={200}
                        className="w-14 text-center"
                        onChange={(v) => patchRow(row.entryId, { laps: v })}
                      />
                    </td>
                  </>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
