import { db } from "@ctr/db";

/** Round <select> options labelled "R1 — Coimbatore (INCRC 2026)". Server-side only. */

export type RoundOption = { id: string; label: string };

export async function loadRoundOptions(): Promise<RoundOption[]> {
  const rows = await db.query.rounds.findMany({
    with: {
      championshipSeason: {
        columns: { year: true },
        with: { championship: { columns: { shortName: true, sort: true } } },
      },
    },
  });
  return rows
    .sort(
      (a, b) =>
        a.championshipSeason.championship.sort - b.championshipSeason.championship.sort ||
        a.championshipSeason.championship.shortName.localeCompare(
          b.championshipSeason.championship.shortName,
        ) ||
        b.championshipSeason.year - a.championshipSeason.year ||
        a.round - b.round,
    )
    .map((r) => ({
      id: r.id,
      label: `R${r.round} — ${r.name} (${r.championshipSeason.championship.shortName} ${r.championshipSeason.year})`,
    }));
}
