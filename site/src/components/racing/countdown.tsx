"use client";

import { useEffect, useState } from "react";

function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function split(target: number, now: number) {
  const d = Math.max(0, target - now);
  return {
    days: Math.floor(d / 86_400_000),
    hours: Math.floor(d / 3_600_000) % 24,
    mins: Math.floor(d / 60_000) % 60,
    secs: Math.floor(d / 1_000) % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Inline live countdown — "Lights out in 23d 04:12". SSR-safe: the server and
 * first client render show a placeholder, the clock starts after mount so
 * there is never a hydration mismatch. Colour is always inherited, so the same
 * component works on white cards and on the blue "up next" card.
 */
export function InlineCountdown({
  targetIso,
  prefix = "Lights out in",
  className = "",
}: {
  targetIso: string;
  prefix?: string;
  className?: string;
}) {
  const now = useNow();
  const parts = now === null ? null : split(new Date(targetIso).getTime(), now);

  return (
    <span role="timer" aria-live="off" className={`whitespace-nowrap ${className}`}>
      {prefix ? <span>{prefix} </span> : null}
      <span className="font-digits">
        {parts === null ? "--d --:--" : `${parts.days}d ${pad(parts.hours)}:${pad(parts.mins)}`}
      </span>
    </span>
  );
}

/**
 * Digits countdown (days / hrs / mins / secs) for results empty states and
 * hero modules: big technical numerals over small muted unit labels.
 */
export function CountdownBoxes({
  targetIso,
  className = "",
}: {
  targetIso: string;
  className?: string;
}) {
  const now = useNow();
  const parts = now === null ? null : split(new Date(targetIso).getTime(), now);

  const cells: { value: number | null; label: string }[] = [
    { value: parts?.days ?? null, label: "days" },
    { value: parts?.hours ?? null, label: "hrs" },
    { value: parts?.mins ?? null, label: "mins" },
    { value: parts?.secs ?? null, label: "secs" },
  ];

  return (
    <div className={`flex items-start gap-6 ${className}`} role="timer" aria-live="off">
      {cells.map((c) => (
        <div key={c.label} className="flex min-w-12 flex-col items-center gap-2">
          <span className="technical-2xl font-bold text-text-5">
            {c.value === null ? "--" : pad(c.value)}
          </span>
          <span className="technical-xs uppercase text-text-3">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
