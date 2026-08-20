"use client";

import { useEffect, useState } from "react";

type Parts = { days: number; hours: number; mins: number; secs: number };

function partsUntil(target: number, now: number): Parts {
  const d = Math.max(0, target - now);
  return {
    days: Math.floor(d / 86_400_000),
    hours: Math.floor(d / 3_600_000) % 24,
    mins: Math.floor(d / 60_000) % 60,
    secs: Math.floor(d / 1_000) % 60,
  };
}

/**
 * Live countdown to an ISO timestamp. SSR-safe: renders "--" placeholders on
 * the server and on the first client render, then starts ticking after mount
 * so there is never a hydration mismatch.
 */
export function Countdown({ targetIso, className = "" }: { targetIso: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const parts = now === null ? null : partsUntil(new Date(targetIso).getTime(), now);

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
            <span className="chamfer-tr min-w-[3rem] border border-line bg-panel px-2 py-1.5 text-center text-2xl font-black tabular-nums text-white">
              {c.value === null ? "--" : String(c.value).padStart(2, "0")}
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
