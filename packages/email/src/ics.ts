/**
 * Zero-dependency RFC 5545 calendar builder, adapted from OpenLeague/Spartan's
 * buildScheduleIcs (Apache-2.0 — see NOTICE): correct text escaping, UTC
 * timestamps and 75-octet line folding with CRLF joins.
 */

export type IcsEvent = {
  uid: string;
  title: string;
  /** ISO instant */
  startsAt: string;
  /** ISO instant; defaults to start + `defaultDurationMinutes` */
  endsAt?: string | null;
  location?: string | null;
  description?: string | null;
  url?: string | null;
};

const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

const formatIcsDate = (iso: string): string =>
  new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

/** RFC 5545 §3.1: fold content lines longer than 75 octets. */
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`; // continuation lines start with a space
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export function buildIcs(
  events: IcsEvent[],
  options: { calendarName: string; prodId?: string; defaultDurationMinutes?: number },
): string {
  const durationMs = (options.defaultDurationMinutes ?? 60) * 60_000;
  const now = formatIcsDate(new Date().toISOString());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${options.prodId ?? "-//CTR Sports//Schedule//EN"}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(options.calendarName)}`,
  ];

  for (const event of events) {
    const end = event.endsAt ?? new Date(Date.parse(event.startsAt) + durationMs).toISOString();
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(event.uid)}`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatIcsDate(event.startsAt)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
    );
    if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    if (event.url) lines.push(`URL:${escapeIcsText(event.url)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
