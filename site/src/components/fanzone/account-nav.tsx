import Link from "next/link";

/* ── Account sub-nav ───────────────────────────────────────────────────────
   White top strip carrying the fan-zone underline tabs, sitting flush on a
   hairline exactly like the results-hub contextual nav (§5.7). Server-only. */

const TABS = [
  { href: "/account", label: "Overview" },
  { href: "/account/saved", label: "Saved" },
  { href: "/account/favourites", label: "Favourites" },
  { href: "/account/predictions", label: "Predictions" },
] as const;

export type AccountTab = (typeof TABS)[number]["href"];

export function AccountNav({ active }: { active: AccountTab }) {
  return (
    <div className="bg-surface-1">
      <div className="f1-inner">
        <nav aria-label="Account" className="-mb-px flex overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = tab.href === active;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`body-m-compact block whitespace-nowrap px-4 py-2 text-center transition-colors duration-500 ${
                  isActive
                    ? "border-b-2 border-brand font-bold text-text-5"
                    : "border-b border-surface-4 font-semibold text-text-3 hover:border-surface-6 hover:text-text-5"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
