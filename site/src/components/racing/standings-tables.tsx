import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { CountryFlag } from "@ctr/ui";
import { CategoryBadge, DriverRoundel, TeamRoundel } from "./category-ui";
import type { ConstructorStandingRow, DriverStandingRow } from "./data";
import { SelectActiveDot, selectItem, selectItemActive, selectMenu } from "./results-table";

/* ── Standings tables + filters (F1 results-table primitives) ──────────────
   White rounded card on the beige hub band; thead 14px uppercase muted over
   a 2px rule, 56px body rows with 1px dividers, 16px Titillium semibold
   cells, first/last column flush at 4px, horizontal scroll on mobile.
   Server-only — the category dropdown is the native <details> pattern. ───── */

/* Cell recipes: 16px vertical, 4px flush left, 24→48px right gutter. */
const TH = "body-xs whitespace-nowrap py-4 pl-1 pr-6 text-left align-top font-semibold uppercase text-text-3 md:pr-12 snap-start scroll-ml-6 md:scroll-ml-12";
const TD = "whitespace-nowrap py-4 pl-1 pr-6 md:pr-12";

/** White table card — combined outer+inner padding of the F1 card (§2.5). */
function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-surface-4 bg-surface-1 px-12 py-8 md:px-16 md:py-10 lg:py-12">
      <div className="snap-x overflow-x-auto overscroll-x-contain">{children}</div>
    </div>
  );
}

/** Empty-state body for a category with no announced entry list. */
export function StandingsEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-surface-1 px-6 py-8 md:px-8">
      <p className="body-s text-text-3">{children}</p>
    </div>
  );
}

/* ── Filters ─────────────────────────────────────────────────────────────── */

export type CategoryOption = { slug: string; name: string; shortName: string; color: string };

/** Black-stroked pill dropdown listing the championship's race categories
 *  (native-details recipe, stroke-medium skin per the filter-row spec). */
export function CategoryDropdown({
  categories,
  activeSlug,
  hrefFor,
}: {
  categories: CategoryOption[];
  activeSlug: string;
  hrefFor: (slug: string) => string;
}) {
  const active = categories.find((c) => c.slug === activeSlug);
  return (
    <details className="group relative max-md:w-full md:min-w-64">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-4 rounded-md border border-surface-4 bg-surface-1 px-4 py-2.5 transition-colors hover:border-surface-6 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-col text-left">
          <span className="body-2xs font-bold uppercase text-text-3">Category</span>
          <span className="body-s flex items-center gap-2 truncate font-bold text-text-5">
            {active ? <CategoryBadge category={active} /> : null}
            {active?.name ?? "Category"}
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          className="shrink-0 text-text-3 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className={selectMenu}>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={hrefFor(c.slug)}
            aria-current={c.slug === activeSlug ? "page" : undefined}
            className={`${selectItem}${c.slug === activeSlug ? ` ${selectItemActive}` : ""}`}
          >
            <CategoryBadge category={c} />
            {c.name}
            {c.slug === activeSlug ? <SelectActiveDot /> : null}
          </Link>
        ))}
      </div>
    </details>
  );
}

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Small pill row for the extra classification tables (overall/rookie/…). */
export function SubTypePills({
  types,
  activeType,
  hrefFor,
}: {
  types: string[];
  activeType: string;
  hrefFor: (type: string) => string;
}) {
  return (
    <nav aria-label="Classification" className="flex flex-wrap items-center gap-2">
      {types.map((t) => (
        <Link
          key={t}
          href={hrefFor(t)}
          aria-current={t === activeType ? "page" : undefined}
          className={`btn btn-sm ${t === activeType ? "btn-black" : "btn-tonal"}`}
        >
          {capitalise(t)}
        </Link>
      ))}
    </nav>
  );
}

/* ── Tables ──────────────────────────────────────────────────────────────── */

/** Drivers' championship table: Pos · Driver · Nationality · Team · Pts. */
export function DriverStandingsTable({ rows }: { rows: DriverStandingRow[] }) {
  return (
    <TableCard>
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-surface-6">
            <th className={TH}>Pos.</th>
            <th className={TH}>Driver</th>
            <th className={TH}>Nationality</th>
            <th className={TH}>Team</th>
            <th className={`${TH} pr-1 text-right`}>Pts.</th>
          </tr>
        </thead>
        <tbody className="body-s font-semibold text-text-5">
          {rows.map((row) => (
            <tr key={row.driver.slug} className="border-b border-surface-4 last:border-0">
              {/* Numerals in the timing face. (No gold on P1 here — gold text
                  has no contrast on a white card; the podium band above the
                  table is what celebrates the leader.) */}
              <td className={`${TD} technical-m`}>{row.position}</td>
              <td className={TD}>
                <Link
                  href={`/drivers/${row.driver.slug}`}
                  className="flex items-center gap-2.5 decoration-2 underline-offset-2 hover:underline"
                >
                  <DriverRoundel
                    headshotPath={row.driver.headshotPath}
                    color={row.team?.color}
                  />
                  <span className="whitespace-nowrap">
                    <span className="hidden lg:inline">{row.driver.firstName}&nbsp;</span>
                    <span className="hidden font-bold md:inline">{row.driver.lastName}</span>
                    <span className="font-bold md:hidden">{row.driver.code}</span>
                  </span>
                </Link>
              </td>
              <td className={TD}>
                {/* Flag only — Windows has no flag glyphs and falls back to the
                    country's two letters, so printing the code too would read
                    "IN IN" there. */}
                {row.driver.countryCode ? (
                  <span className="flex items-center gap-2">
                    <CountryFlag code={row.driver.countryCode} className="text-xl leading-none" />
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className={TD}>
                {row.team ? (
                  <Link
                    href={`/teams/${row.team.teamSlug}`}
                    className="inline-flex items-center gap-2.5 decoration-2 underline-offset-2 hover:underline"
                  >
                    <TeamRoundel logoPath={row.team.logoPath} color={row.team.color} />
                    {row.team.shortName}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className={`${TD} technical-m pr-1 text-right`}>{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableCard>
  );
}

/** Teams' championship table: Pos · Team · Wins · Pts. */
export function ConstructorStandingsTable({ rows }: { rows: ConstructorStandingRow[] }) {
  return (
    <TableCard>
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-surface-6">
            <th className={TH}>Pos.</th>
            <th className={TH}>Team</th>
            <th className={TH}>Wins</th>
            <th className={`${TH} pr-1 text-right`}>Pts.</th>
          </tr>
        </thead>
        <tbody className="body-s font-semibold text-text-5">
          {rows.map((row) => (
            <tr key={row.team.teamSlug} className="border-b border-surface-4 last:border-0">
              <td className={`${TD} technical-m`}>{row.position}</td>
              <td className={TD}>
                <Link
                  href={`/teams/${row.team.teamSlug}`}
                  className="inline-flex items-center gap-2.5 decoration-2 underline-offset-2 hover:underline"
                >
                  <TeamRoundel logoPath={row.team.logoPath} color={row.team.color} />
                  {row.team.displayName}
                </Link>
              </td>
              <td className={`${TD} technical-m`}>{row.wins}</td>
              <td className={`${TD} technical-m pr-1 text-right`}>{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableCard>
  );
}
