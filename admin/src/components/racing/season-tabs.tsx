import Link from "next/link";
import { db } from "@ctr/db";

/**
 * Shared championship-season picker for the racing sections (races / results /
 * standings). Server-side only — reads @ctr/db.
 */

export type SeasonTab = { id: string; label: string; year: number; isCurrent: boolean };

/** All championship seasons as picker tabs — championship order, newest year first. */
export async function loadSeasonTabs(): Promise<SeasonTab[]> {
  const rows = await db.query.championshipSeasons.findMany({
    with: { championship: { columns: { shortName: true, sort: true } } },
  });
  return rows
    .sort(
      (a, b) =>
        a.championship.sort - b.championship.sort ||
        a.championship.shortName.localeCompare(b.championship.shortName) ||
        b.year - a.year,
    )
    .map((s) => ({
      id: s.id,
      label: `${s.championship.shortName} ${s.year}`,
      year: s.year,
      isCurrent: s.isCurrent,
    }));
}

/** The requested season when valid, else the current one, else the first. */
export function pickSeason(seasons: SeasonTab[], requested?: string): SeasonTab | undefined {
  return seasons.find((s) => s.id === requested) ?? seasons.find((s) => s.isCurrent) ?? seasons[0];
}

export function SeasonTabs({
  seasons,
  activeId,
  base,
}: {
  seasons: SeasonTab[];
  activeId: string;
  base: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b-2 border-line">
      {seasons.map((s) => (
        <Link
          key={s.id}
          href={`${base}?season=${s.id}`}
          className={`px-4 py-2 text-sm font-black uppercase tracking-wide transition-colors ${
            s.id === activeId ? "chamfer-tr bg-panel text-fg" : "text-fg-muted hover:text-fg"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
