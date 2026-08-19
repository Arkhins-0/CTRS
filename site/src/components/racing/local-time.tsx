"use client";

import { useEffect, useState } from "react";

type Mode = "time" | "date" | "datetime";

function formatIso(iso: string, mode: Mode, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions =
    mode === "time"
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : mode === "date"
        ? { weekday: "short", day: "numeric", month: "short" }
        : { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false };
  // Fixed locale so server and first client render always agree.
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).format(new Date(iso));
}

/**
 * Renders an ISO timestamp in the viewer's local timezone. SSR-safe: the
 * server (and first client render) shows the UTC value, then useEffect swaps
 * in the local value after hydration (suppressHydrationWarning covers the
 * swap for bots/no-JS edge cases).
 */
export function LocalTime({
  iso,
  mode = "datetime",
  className = "",
}: {
  iso: string;
  mode?: Mode;
  className?: string;
}) {
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    setLocal(formatIso(iso, mode));
  }, [iso, mode]);

  return (
    <time dateTime={iso} suppressHydrationWarning className={className}>
      {local ?? `${formatIso(iso, mode, "UTC")}${mode === "date" ? "" : " UTC"}`}
    </time>
  );
}
