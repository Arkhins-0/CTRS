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
 * there is never a hydration mismatch. Text colour is inherited, so it works
 * on accent surfaces (accent-fg) and dark surfaces alike.
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
    <span role="timer" aria-live="off" className={`whitespace-nowrap tabular-nums ${className}`}>
      {prefix ? `${prefix} ` : ""}
      {parts === null ? "--d --:--" : `${parts.days}d ${pad(parts.hours)}:${pad(parts.mins)}`}
    </span>
  );
}

/** Boxed countdown (days/hrs/mins/secs) for empty states and heroes. */
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
    <div className={`flex items-start gap-2 ${className}`} role="timer" aria-live="off">
      {cells.map((c, i) => (
        <div key={c.label} className="flex items-start gap-2">
          {i > 0 ? <span className="pt-1.5 text-lg font-black text-fg-faint">:</span> : null}
          <div className="flex flex-col items-center">
            <span
              className="chamfer-tr min-w-[3rem] bg-panel px-2 py-1.5 text-center text-2xl font-black tabular-nums text-white"
              style={{ ["--chamfer" as string]: "8px" }}
            >
              {c.value === null ? "--" : pad(c.value)}
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-fg-faint">
              {c.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
