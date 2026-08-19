"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";

/**
 * Renders a timestamp in the visitor's local timezone. The server renders the
 * time in server TZ as a best-effort first paint; after mount the same value
 * is re-formatted in the browser's timezone (suppressHydrationWarning keeps
 * React quiet about the deliberate difference).
 */
export function LocalTime({
  iso,
  fmt = "EEE d MMM · HH:mm",
  className = "",
}: {
  iso: string;
  fmt?: string;
  className?: string;
}) {
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    setLocal(format(new Date(iso), fmt));
  }, [iso, fmt]);

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {local ?? format(new Date(iso), fmt)}
    </time>
  );
}
