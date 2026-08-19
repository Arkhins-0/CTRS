/**
 * Fetches real F1 data (2025 + 2026) from the Jolpica-F1 API (Ergast-compatible)
 * into JSON files under src/seed/data/. The seed script reads those files, so
 * seeding itself never needs the network. Re-run any time to refresh:
 *
 *   npm run db:fetch-data
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const API = "https://api.jolpi.ca/ergast/f1";
const YEARS = [2025, 2026];
const OUT = resolve(process.cwd(), "src/seed/data");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let requests = 0;

async function get(path: string): Promise<any> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await sleep(attempt === 1 ? 400 : 1500 * attempt); // stay well under rate limits
      requests++;
      const res = await fetch(`${API}${path}`, {
        headers: { "User-Agent": "ctrsports-seed/1.0 (local dev seeding)" },
      });
      if (res.status === 429) throw new Error("rate limited");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()).MRData;
    } catch (err) {
      if (attempt === 4) throw new Error(`GET ${path} failed: ${err}`);
      console.log(`  retry ${attempt} for ${path} (${err})`);
    }
  }
}

function write(rel: string, data: unknown) {
  const file = resolve(OUT, rel);
  mkdirSync(resolve(file, ".."), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 1));
  console.log(`  wrote ${rel}`);
}

async function fetchSeason(year: number) {
  console.log(`\n=== Season ${year} ===`);

  // Calendar (includes per-session dates/times + sprint markers)
  const calendar = (await get(`/${year}.json?limit=100`)).RaceTable.Races as any[];
  write(`${year}/calendar.json`, calendar);

  // Drivers & constructors that appear this season
  const drivers = (await get(`/${year}/drivers.json?limit=100`)).DriverTable.Drivers;
  write(`${year}/drivers.json`, drivers);
  const constructors = (await get(`/${year}/constructors.json?limit=100`)).ConstructorTable
    .Constructors;
  write(`${year}/constructors.json`, constructors);

  // Per-round classifications: race, qualifying, sprint (where the weekend has one)
  const rounds: any[] = [];
  for (const race of calendar) {
    const round = Number(race.round);
    const [raceRes, qualiRes] = [
      (await get(`/${year}/${round}/results.json?limit=100`)).RaceTable.Races[0] ?? null,
      (await get(`/${year}/${round}/qualifying.json?limit=100`)).RaceTable.Races[0] ?? null,
    ];
    let sprintRes = null;
    if (race.Sprint) {
      sprintRes = (await get(`/${year}/${round}/sprint.json?limit=100`)).RaceTable.Races[0] ?? null;
    }
    rounds.push({
      round,
      results: raceRes?.Results ?? [],
      qualifying: qualiRes?.QualifyingResults ?? [],
      sprint: sprintRes?.SprintResults ?? [],
    });
    const done = raceRes?.Results?.length ? "✓" : "·";
    console.log(`  round ${String(round).padStart(2)} ${done} ${race.raceName}`);
  }
  write(`${year}/rounds.json`, rounds);

  // Official standings — used to verify our computed standings match reality
  const ds =
    (await get(`/${year}/driverstandings.json?limit=100`)).StandingsTable.StandingsLists[0] ?? null;
  const cs =
    (await get(`/${year}/constructorstandings.json?limit=100`)).StandingsTable.StandingsLists[0] ??
    null;
  write(`${year}/official-standings.json`, {
    round: ds?.round ?? null,
    drivers: ds?.DriverStandings ?? [],
    constructors: cs?.ConstructorStandings ?? [],
  });

  return calendar;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const circuitMap = new Map<string, any>();

  for (const year of YEARS) {
    const calendar = await fetchSeason(year);
    for (const race of calendar) circuitMap.set(race.Circuit.circuitId, race.Circuit);
  }

  write("circuits.json", [...circuitMap.values()]);
  console.log(`\nDone — ${requests} API requests.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
