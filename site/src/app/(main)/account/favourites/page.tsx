import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import {
  db,
  drivers,
  driverSeasonEntries,
  fanFavourites,
  siteSettings,
  teams,
  teamSeasonEntries,
} from "@ctr/db";
import { ChamferCard, CountryFlag, SectionHeading, TeamColorBar } from "@ctr/ui";
import { requireFan } from "@/lib/fan-auth";
import { mediaUrl, placeholderStyle } from "@/lib/media";
import { Field, SelectInput } from "@/components/fanzone/form";
import { SubmitButton } from "@/components/fanzone/submit-button";
import { removeFavourite, setFavourite } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My favourites",
  description: "Your favourite driver and team.",
};

export default async function FavouritesPage() {
  const { fan } = await requireFan();

  // fan-zone pages read directly (no cached()) — current season straight from siteSettings
  const [seasonRow] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, "current_season"));
  const seasonYear =
    (seasonRow?.value as { year?: number } | undefined)?.year ?? new Date().getFullYear();

  const favourites = await db
    .select()
    .from(fanFavourites)
    .where(eq(fanFavourites.fanId, fan.id));
  const driverFav = favourites.find((f) => f.entityType === "driver");
  const teamFav = favourites.find((f) => f.entityType === "team");

  const [favDriver, favDriverEntry, favTeam, favTeamEntry, allDriverEntries, allTeamEntries] =
    await Promise.all([
      driverFav
        ? db.query.drivers.findFirst({
            where: eq(drivers.id, driverFav.entityId),
            with: { headshot: true },
          })
        : Promise.resolve(undefined),
      driverFav
        ? db.query.driverSeasonEntries.findFirst({
            where: and(
              eq(driverSeasonEntries.driverId, driverFav.entityId),
              eq(driverSeasonEntries.seasonYear, seasonYear),
            ),
            with: { teamSeasonEntry: true },
          })
        : Promise.resolve(undefined),
      teamFav
        ? db.query.teams.findFirst({
            where: eq(teams.id, teamFav.entityId),
            with: { logo: true },
          })
        : Promise.resolve(undefined),
      teamFav
        ? db.query.teamSeasonEntries.findFirst({
            where: and(
              eq(teamSeasonEntries.teamId, teamFav.entityId),
              eq(teamSeasonEntries.seasonYear, seasonYear),
            ),
          })
        : Promise.resolve(undefined),
      db.query.driverSeasonEntries.findMany({
        where: eq(driverSeasonEntries.seasonYear, seasonYear),
        with: { driver: true, teamSeasonEntry: true },
      }),
      db.query.teamSeasonEntries.findMany({
        where: eq(teamSeasonEntries.seasonYear, seasonYear),
        with: { team: true },
      }),
    ]);

  // active current-season drivers, de-duplicated (mid-season swaps create 2 entries)
  const seenDrivers = new Set<string>();
  const driverOptions = allDriverEntries
    .filter((e) => e.driver.isActive)
    .filter((e) => (seenDrivers.has(e.driverId) ? false : (seenDrivers.add(e.driverId), true)))
    .sort((a, b) => a.driver.lastName.localeCompare(b.driver.lastName));

  const teamOptions = [...allTeamEntries].sort((a, b) => a.shortName.localeCompare(b.shortName));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <SectionHeading
        right={
          <Link href="/account" className="uppercase text-f1-red hover:underline">
            ← My account
          </Link>
        }
      >
        My favourites
      </SectionHeading>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* ── favourite driver ─────────────────────────────────────────── */}
        <section>
          <h3 className="text-sm font-black uppercase tracking-wide text-f1-grey">
            Favourite driver
          </h3>

          {favDriver ? (
            <ChamferCard className="relative mt-3 overflow-hidden bg-carbon p-5 text-white">
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{
                  backgroundColor: favDriverEntry?.teamSeasonEntry?.primaryColor ?? "#67676d",
                }}
                aria-hidden
              />
              <div className="flex items-center gap-4">
                {mediaUrl(favDriver.headshot?.path) ? (
                  <Image
                    src={mediaUrl(favDriver.headshot?.path)!}
                    alt={`${favDriver.firstName} ${favDriver.lastName}`}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full text-sm font-black uppercase text-white/80"
                    style={placeholderStyle(`${favDriver.firstName} ${favDriver.lastName}`)}
                  >
                    {favDriver.code}
                  </div>
                )}
                <div className="flex items-stretch gap-3">
                  <TeamColorBar color={favDriverEntry?.teamSeasonEntry?.primaryColor} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-f1-grey-light">
                      {favDriverEntry
                        ? `#${favDriverEntry.carNumber} · ${favDriverEntry.teamSeasonEntry.shortName}`
                        : "No current-season entry"}
                    </p>
                    <p className="text-xl font-black uppercase tracking-tight">
                      {favDriver.firstName} {favDriver.lastName}{" "}
                      <CountryFlag code={favDriver.countryCode} />
                    </p>
                  </div>
                </div>
              </div>
              <form action={removeFavourite} className="mt-4">
                <input type="hidden" name="entityType" value="driver" />
                <button
                  type="submit"
                  className="text-xs font-bold uppercase tracking-wide text-f1-grey-light transition-colors hover:text-f1-red"
                >
                  Remove favourite
                </button>
              </form>
            </ChamferCard>
          ) : (
            <ChamferCard className="mt-3 border border-dashed border-f1-grey-light bg-white p-6 text-center text-sm text-f1-grey">
              No favourite driver yet — pick one below.
            </ChamferCard>
          )}

          <form
            action={setFavourite}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="entityType" value="driver" />
            <div className="flex-1">
              <Field label={`Choose a ${seasonYear} driver`} htmlFor="fav-driver">
                <SelectInput
                  id="fav-driver"
                  name="entityId"
                  required
                  defaultValue={driverFav?.entityId ?? ""}
                >
                  <option value="" disabled>
                    Select a driver…
                  </option>
                  {driverOptions.map((e) => (
                    <option key={e.driverId} value={e.driverId}>
                      {e.driver.firstName} {e.driver.lastName} — {e.teamSeasonEntry.shortName}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <SubmitButton label="Set favourite" pendingLabel="Saving…" />
          </form>
        </section>

        {/* ── favourite team ───────────────────────────────────────────── */}
        <section>
          <h3 className="text-sm font-black uppercase tracking-wide text-f1-grey">
            Favourite team
          </h3>

          {favTeam ? (
            <ChamferCard className="relative mt-3 overflow-hidden bg-carbon p-5 text-white">
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: favTeamEntry?.primaryColor ?? "#67676d" }}
                aria-hidden
              />
              <div className="flex items-center gap-4">
                {mediaUrl(favTeam.logo?.path) ? (
                  <Image
                    src={mediaUrl(favTeam.logo?.path)!}
                    alt={favTeam.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 object-contain"
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-black uppercase text-white/80"
                    style={placeholderStyle(favTeam.name)}
                  >
                    {favTeam.name.slice(0, 2)}
                  </div>
                )}
                <div className="flex items-stretch gap-3">
                  <TeamColorBar color={favTeamEntry?.primaryColor} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-f1-grey-light">
                      {favTeam.base ? `${favTeam.base} · ` : ""}
                      {favTeam.worldChampionships}× champions
                    </p>
                    <p className="text-xl font-black uppercase tracking-tight">
                      {favTeamEntry?.shortName ?? favTeam.name}{" "}
                      <CountryFlag code={favTeam.countryCode} />
                    </p>
                  </div>
                </div>
              </div>
              <form action={removeFavourite} className="mt-4">
                <input type="hidden" name="entityType" value="team" />
                <button
                  type="submit"
                  className="text-xs font-bold uppercase tracking-wide text-f1-grey-light transition-colors hover:text-f1-red"
                >
                  Remove favourite
                </button>
              </form>
            </ChamferCard>
          ) : (
            <ChamferCard className="mt-3 border border-dashed border-f1-grey-light bg-white p-6 text-center text-sm text-f1-grey">
              No favourite team yet — pick one below.
            </ChamferCard>
          )}

          <form
            action={setFavourite}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="entityType" value="team" />
            <div className="flex-1">
              <Field label={`Choose a ${seasonYear} team`} htmlFor="fav-team">
                <SelectInput
                  id="fav-team"
                  name="entityId"
                  required
                  defaultValue={teamFav?.entityId ?? ""}
                >
                  <option value="" disabled>
                    Select a team…
                  </option>
                  {teamOptions.map((e) => (
                    <option key={e.teamId} value={e.teamId}>
                      {e.shortName}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <SubmitButton label="Set favourite" pendingLabel="Saving…" />
          </form>
        </section>
      </div>
    </main>
  );
}
