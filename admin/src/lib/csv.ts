/**
 * RFC 4180 CSV serialisation and parsing.
 *
 * The important part is escapeCell's formula guard. Spreadsheet software
 * evaluates any cell whose text begins with =, +, - or @ as a formula, so a
 * member who sets their display name to `=HYPERLINK(...)` would execute code
 * in the spreadsheet of whoever opens the export. Prefixing those with an
 * apostrophe neutralises it; numbers are left alone so real numeric columns
 * still behave as numbers.
 */

const NEEDS_QUOTING = /[",\r\n]/;
const FORMULA_LEAD = /^[=+\-@\t\r]/;
// Anything that is unambiguously a number stays untouched.
const NUMERIC = /^-?\d+(\.\d+)?$/;

export function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = value instanceof Date ? value.toISOString() : String(value);

  if (NUMERIC.test(text)) {
    // A bare negative number leads with "-" but is not a formula.
    return text;
  }

  if (FORMULA_LEAD.test(text)) text = `'${text}`;
  if (NEEDS_QUOTING.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCell).join(","));
  // CRLF per RFC 4180; the BOM makes Excel read it as UTF-8 rather than the
  // local codepage, which otherwise mangles every non-ASCII name.
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Builds a downloadable CSV response with the right headers. */
export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "cache-control": "no-store",
    },
  });
}

/**
 * Minimal RFC 4180 parser — handles quoted fields, embedded commas, escaped
 * quotes and both line ending styles. Returns rows of raw strings; callers
 * validate.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, ""); // strip BOM if the file has one
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++; // consume the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r") {
      // swallow; the \n branch closes the row
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  // Trailing cell/row when the file does not end with a newline.
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/**
 * Parses a CSV with a header row into objects keyed by lowercased header.
 * Unknown columns are preserved so callers can report on them.
 */
export function parseCsvRecords(input: string): Record<string, string>[] {
  const rows = parseCsv(input);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = (row[i] ?? "").trim();
    });
    return record;
  });
}
