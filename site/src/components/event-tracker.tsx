"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { CountryFlag } from "@ctr/ui";

export type TrackerData = {
  year: number;
  slug: string;
  name: string;
  countryCode: string | null;
  round: number;
  live: boolean;
  sessionLabel: string;
  targetIso: string | null;
};

function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "19 H 12 M 28 S" — digits in the technical face, unit letters dimmed. */
function TrackerCountdown({ targetIso }: { targetIso: string }) {
  const now = useNow();
  const delta = now === null ? null : Math.max(0, Date.parse(targetIso) - now);

  const cells: { value: string; unit: string }[] = [];
  if (delta === null) {
    cells.push({ value: "--", unit: "H" }, { value: "--", unit: "M" }, { value: "--", unit: "S" });
  } else {
    const days = Math.floor(delta / 86_400_000);
    const hours = Math.floor(delta / 3_600_000) % 24;
    const mins = Math.floor(delta / 60_000) % 60;
    const secs = Math.floor(delta / 1_000) % 60;
    if (days > 0) {
      cells.push(
        { value: String(days), unit: "D" },
        { value: pad(hours), unit: "H" },
        { value: pad(mins), unit: "M" },
      );
    } else {
      cells.push(
        { value: pad(hours), unit: "H" },
        { value: pad(mins), unit: "M" },
        { value: pad(secs), unit: "S" },
      );
    }
  }

  return (
    <span role="timer" aria-live="off" className="flex items-end gap-0.5">
      {cells.map((c, i) => (
        <span key={i} className="flex items-end gap-0.5 pr-1">
          <span className="technical-m font-bold text-white">{c.value}</span>
          <span className="technical-xs text-static-3">{c.unit}</span>
        </span>
      ))}
    </span>
  );
}

/** Bar 3 of the header: next-event strip that collapses away on scroll. */
export function EventTracker({ data }: { data: TrackerData }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    /*
     * Hysteresis, not a single threshold. Collapsing this strip removes
     * ~56px of header height, which shifts the page under the finger; with
     * one cutoff the scroll position oscillates across it (mobile URL-bar
     * resizes and rubber-banding add their own jitter) and the bar twitches
     * open/closed repeatedly around that line. Two far-apart thresholds
     * mean no single scroll position can flip it both ways: collapse only
     * once clearly into the page, expand only back at the very top.
     */
    const COLLAPSE_AT = 160;
    const EXPAND_AT = 10;
    const onScroll = () =>
      setCollapsed((c) => (c ? window.scrollY > EXPAND_AT : window.scrollY > COLLAPSE_AT));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`dark-section grid overflow-y-hidden transition-[grid-template-rows] duration-500 ease-out ${
        collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="border-b border-surface-4 bg-static-10">
          <div className="f1-inner flex min-h-[56px] flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2 text-white">
            <div className="flex items-center gap-3">
              <Link
                href={`/schedule/${data.year}/${data.slug}`}
                className="group flex items-center gap-2"
              >
                <CountryFlag code={data.countryCode} className="text-base leading-none" />
                <span className="display-s group-hover:underline">{data.name}</span>
                <ChevronRight size={16} aria-hidden className="text-static-5" />
              </Link>
              <div className="flex items-center gap-3">
                {data.live ? (
                  <span
                    className="rounded-sm bg-live-blue px-2 py-0.5 text-[11px] uppercase leading-4 tracking-wide text-white"
                    style={{ fontFamily: "var(--font-poster)" }}
                  >
                    Live
                  </span>
                ) : null}
                <span className="display-m font-medium">{data.sessionLabel}</span>
                {data.targetIso && !data.live ? (
                  <>
                    <span aria-hidden className="self-stretch border-l border-white/20" />
                    <TrackerCountdown targetIso={data.targetIso} />
                  </>
                ) : null}
              </div>
            </div>
            <span className="display-s hidden text-static-5 md:block">
              Round {data.round}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
