# Championships v2 — multi-championship architecture proposal

Status: **PROPOSED — awaiting approval before anything touches the Neon database.**

## Context

The platform must support multiple championships in one codebase. Today the racing model has a
single global `seasons.year` PK, F1-flavoured naming (`grandsPrix`), a hardcoded points array on
the season row, one-session-per-type weekends (patched with a `race2` enum value), and exactly one
standings table per driver/team per season+category. The INCRC pivot already added
`raceCategories` (the 7 classes) — v2 completes the generalisation.

Note on the original brief: it assumed the DB still held F1 data that "must keep working". That F1
data was **removed at your instruction** during the CTR pivot — the live DB holds only INCRC 2026
seed data (zero human-entered rows so far). This makes the migration far simpler than the brief
assumed.

## Model

Two levels, deliberately: a **championship** is an umbrella series with its own seasons, rounds,
branding and points config; a **category** is a class racing *within* a championship's rounds
(INCRC runs 7 classes on shared weekends). A future standalone series (e.g. an F4 championship, or
re-imported F1 as an archive) is simply a championship whose rounds carry a single category — no
special-casing.

### New tables

```ts
championships {
  id uuid PK, slug unique, name, shortName,
  type varchar(40),               // "mixed" | "touring" | "single_seater" | ...
  description text,
  logoMediaId → media, primaryColor char(7), secondaryColor char(7),  // per-championship theming
  isActive bool, sort int
}

championshipSeasons {
  id uuid PK,
  championshipId → championships (cascade),
  year int, isCurrent bool,
  pointsSystem jsonb,             // { race: [25,18,…], sprint: [8,…], fastestLapPoint?: bool }
  standingsTypes text[],          // enabled classifications: ["overall","team","rookie","gentlemen",…]
  UNIQUE(championshipId, year)
}
```

### Renames / re-keys (racing tables only — auth, content, fanzone untouched)

| Today | v2 |
|---|---|
| `seasons` (year PK, racePoints/sprintPoints arrays) | **dropped** → `championshipSeasons.pointsSystem` |
| `grandsPrix.seasonYear` | `rounds.championshipSeasonId` (table renamed **grands_prix → rounds**; uniques become (championshipSeasonId, round) and (championshipSeasonId, slug)) |
| `raceSessions.grandPrixId`, unique (gp, category, type) | `raceSessions.roundId`, + **`sequence` int default 1**, unique (roundId, categoryId, type, **sequence**) — Race 1/2/3 = type "race", sequence 1/2/3. The `race2` enum value stops being used (existing rows map to race + sequence 2; the value stays in the pg enum since Postgres can't drop enum values cheaply). |
| `raceCategories` | + `championshipId` FK |
| `teamSeasonEntries.seasonYear` | `championshipSeasonId`; unique (teamId, championshipSeasonId) |
| `driverSeasonEntries.seasonYear` | `championshipSeasonId`; + **`classification` varchar(30) null** ("rookie" / "gentlemen" / …) |
| `driverStandings` / `constructorStandings` `.seasonYear` | `championshipSeasonId`; + **`standingsType` varchar(30) default "overall"**; uniques (championshipSeasonId, categoryId, standingsType, driverId / teamSeasonEntryId) |

### computeStandings v2

Signature becomes `computeStandings(db, championshipSeasonId)`. Points come from
`championshipSeasons.pointsSystem`. For each category it emits the `overall` (driver) and `team`
tables as today, plus one sub-table per extra enabled `standingsType`, built by filtering entries
whose `classification` matches (e.g. Levitas Rookie = Levitas category standings restricted to
rookie-tagged entries, with its own 1..N positions). All `race`-type sessions score regardless of
sequence; `sprint` uses the sprint scheme. Countback tie-breaks unchanged.

### Levitas Cup Rookie / Gentlemen

Modelled as ONE category (one physical grid) + two parallel classifications via
`driverSeasonEntries.classification` and `standingsType` — matching how the real-world cup runs
(everyone races together; separate trophies). The alternative (two separate categories) would
wrongly imply separate races. → default: one category, two standings types.

### Per-championship theming (packages/ui)

- New scoped CSS vars: `--champ-primary`, `--champ-secondary`; token `--color-champ:
  var(--champ-primary, var(--color-accent))` (falls back to the global CMS accent).
- New `ChampionshipTheme` wrapper component sets the vars from a championship row; shared racing
  components (hero bands, standings tables, round cards, category badges) switch their accent
  usage to `champ` tokens, so any future championship page is re-skinned by wrapping it — no forked
  pages. INCRC's colours = the current CTR yellow, so nothing visibly changes until a second
  championship exists.

### What maps onto what (live DB, all seed-generated)

1. Insert championship `incrc` (name/short/colours/crest logo).
2. Insert championshipSeason `{incrc, 2026, pointsSystem from the current seasons row, standingsTypes: ["overall","team","rookie","gentlemen"]}`.
3. Re-key the 4 GPs → rounds, sessions (race2 → race/seq-2), 6 team entries, 56 driver entries
   (Levitas drivers get alternating rookie/gentlemen classifications as placeholders), standings.
4. F1: nothing to migrate (already deleted). Optionally re-importable later as an archived
   championship via a new fetch script — not in this wave.

## Migration mechanics — the decision to confirm

**Option A — rebuild racing tables (recommended).** Every racing row in Neon is one-day-old seed
output with zero human edits. Migration 0003 drops the racing tables + seasons and creates the v2
shape; the seed is updated to v2 and re-run. Media/content/auth/fanzone tables are untouched
(articles, pages, uploaded S3 assets, admin users, settings all survive). Deterministic, no rename
choreography, clean drizzle snapshots.

**Option B — in-place migration.** Hand-written SQL: `ALTER TABLE … RENAME`, add columns, backfill
championship/season rows, swap FKs, rewrite uniques, then reconcile the drizzle snapshot. Only
worth the risk if real data has been entered through the CMS since seeding.

## Code impact (after schema lands)

- `packages/db`: schema v2, points.ts v2, seed v2, tags (`TAGS.championships`).
- `site`: racing data layer re-pointed (season year → championship season lookup by year within
  the INCRC championship; URLs keep using the year — `/schedule/2026` resolves via championship
  slug + year, INCRC assumed as the site's home championship via a `home_championship` setting).
- `admin`: races/results/standings/teams/drivers sections re-pointed; new Championships CRUD
  (name/colours/logo/seasons/points editor + standings-types checkboxes); results grid gets a
  "sequence" concept (Race 1/Race 2 tabs) replacing race2.
