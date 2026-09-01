"use client";

import { useState } from "react";

/* ── DRIVERS / TEAMS tab switcher for the homepage season band ─────────────
   Both panels arrive fully server-rendered as props; this component only
   holds which one is visible, so switching tabs is instant and never
   navigates away (the F1.com behaviour). Hidden panels stay in the DOM —
   their images are lazy-loaded, so the cost is markup, not bandwidth. ───── */

const TABS = [
  { key: "drivers", label: "Drivers" },
  { key: "teams", label: "Teams" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function StandingsTabs({
  drivers,
  teams,
}: {
  drivers: React.ReactNode;
  teams: React.ReactNode | null;
}) {
  const [tab, setTab] = useState<TabKey>("drivers");
  const panels: Record<TabKey, React.ReactNode> = { drivers, teams };

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="border-b-2 border-surface-4">
        <div role="tablist" aria-label="Standings" className="-mb-[2px] flex">
          {TABS.filter((t) => panels[t.key] != null).map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`standings-panel-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`body-m-compact block max-w-[220px] flex-1 cursor-pointer border-b-2 px-4 py-2 text-center uppercase transition-colors duration-300 md:px-6 ${
                  active
                    ? "border-brand font-bold text-text-5"
                    : "border-transparent font-semibold text-text-3 hover:border-surface-6 hover:text-text-5"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {TABS.filter((t) => panels[t.key] != null).map((t) => (
        <div
          key={t.key}
          id={`standings-panel-${t.key}`}
          role="tabpanel"
          hidden={t.key !== tab}
          className="flex flex-col gap-6 lg:gap-8"
        >
          {panels[t.key]}
        </div>
      ))}
    </div>
  );
}
