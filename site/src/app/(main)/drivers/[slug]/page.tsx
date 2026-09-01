import { differenceInYears, parseISO } from "date-fns";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag } from "@ctr/ui";
import { CategoryBadge, DriverRoundel } from "@/components/racing/category-ui";
import { readableOn, shadeHex } from "@/components/racing/colors";
import { getDriverDetail } from "@/components/racing/data";
import { formatDate } from "@/components/racing/meta";
import { FactCard, HalftoneWash, StatCard } from "@/components/racing/profile-ui";
import { RacingLine } from "@/components/racing/racing-line";
import { mediaUrl } from "@/lib/media";

/* ── Driver profile — F1.com-style: white ground, giant black name, the
   headshot on a compact team-colour halftone panel (not a full-bleed team
   gradient), stat cards instead of a dark statistics band. ──────────────── */

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const driver = await getDriverDetail(slug);
  if (!driver) return {};
  return {
    title: `${driver.firstName} ${driver.lastName}`,
    description: `${driver.firstName} ${driver.lastName} — ${
      driver.current?.category?.name ?? "INCRC"
    } driver profile, season form, career statistics and biography.`,
  };
}

export default async function DriverPage({ params }: Props) {
  const { slug } = await params;
  const driver = await getDriverDetail(slug);
  if (!driver) notFound();

  const fullName = `${driver.firstName} ${driver.lastName}`;
  const headshot = mediaUrl(driver.headshotPath);
  const teamColor = driver.current?.teamColor ?? "#67676d";
  const teamFg = readableOn(teamColor);
  const teamDark = shadeHex(teamColor, -0.35);
  const initials =
    `${driver.firstName[0] ?? ""}${driver.lastName[0] ?? ""}`.toUpperCase();
  const age = driver.dateOfBirth
    ? differenceInYears(new Date(), parseISO(driver.dateOfBirth))
    : null;
  const seasonStarted = (driver.season?.computedThroughRound ?? 0) > 0;

  return (
    <main>
      {/* ── Hero: identity left, halftone portrait panel right ───────────── */}
      <section className="bg-surface-1">
        <div className="f1-inner grid items-end gap-8 py-8 lg:grid-cols-[1fr_auto] lg:py-12">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              {driver.current?.category ? (
                <CategoryBadge category={driver.current.category} />
              ) : null}
              <CountryFlag code={driver.countryCode} className="text-xl leading-none" />
              <span className="body-xs font-bold uppercase text-text-3">{driver.code}</span>
            </div>
            <h1 className="mt-4">
              <span className="display-2xl lg:display-3xl block font-normal text-text-4">
                {driver.firstName}
              </span>
              <span className="display-4xl lg:display-5xl block font-black uppercase text-text-5">
                {driver.lastName}
              </span>
            </h1>
            {driver.current ? (
              <div className="body-s mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold text-text-4">
                <Link
                  href={`/teams/${driver.current.teamSlug}`}
                  className="decoration-2 underline-offset-2 hover:underline"
                >
                  {driver.current.teamName}
                </Link>
                <span aria-hidden className="text-text-3">
                  ·
                </span>
                <span
                  className="font-digits text-xl font-bold leading-none"
                  style={{ color: teamDark }}
                >
                  {driver.current.carNumber}
                </span>
              </div>
            ) : null}
          </div>

          {/* portrait panel — team colour + halftone, giant number behind */}
          <div
            className="relative h-64 w-full overflow-hidden rounded-lg sm:w-[340px] lg:h-80 lg:w-[400px]"
            style={{ backgroundColor: teamColor, color: teamFg }}
          >
            <HalftoneWash fg={teamFg} />
            {driver.current ? (
              <span
                aria-hidden
                className="pointer-events-none absolute right-4 top-0 select-none font-display text-[10rem] font-black leading-none lg:text-[12rem]"
                style={{ color: teamDark }}
              >
                {driver.current.carNumber}
              </span>
            ) : null}
            {headshot ? (
              <span className="absolute bottom-0 left-1/2 aspect-square w-[230px] -translate-x-1/2 lg:w-[290px]">
                <Image
                  src={headshot}
                  alt={fullName}
                  fill
                  sizes="290px"
                  className="object-contain object-bottom"
                  priority
                />
              </span>
            ) : (
              <span
                aria-hidden
                className="absolute bottom-4 left-1/2 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full font-display text-4xl font-black"
                style={{ backgroundColor: teamDark, color: readableOn(teamDark) }}
              >
                {initials}
              </span>
            )}
          </div>
        </div>
        {/* team-colour accent strip closing the hero, F1-style */}
        <div aria-hidden className="h-1.5" style={{ backgroundColor: teamColor }} />
      </section>

      {/* ── Statistics: white stat cards on the light band ────────────────── */}
      <section className="bg-surface-2">
        <div className="f1-inner py-12 lg:py-16">
          <h2 className="display-xl lg:display-2xl font-black uppercase text-text-5">
            Statistics
          </h2>

          <p className="display-s mt-8 font-medium uppercase text-text-3">
            {driver.season?.year ?? driver.current?.seasonYear ?? ""} Season
            {driver.current?.category ? ` · ${driver.current.category.shortName}` : ""}
          </p>
          {driver.season ? (
            <>
              <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
                <StatCard
                  label="Position"
                  value={
                    seasonStarted && driver.season.position != null
                      ? `P${driver.season.position}`
                      : "—"
                  }
                />
                <StatCard label="Points" value={driver.season.points} />
                <StatCard label="Races" value={driver.season.races} />
                <StatCard label="Wins" value={driver.season.wins} />
                <StatCard label="Podiums" value={driver.season.podiums} />
                <StatCard label="Poles" value={driver.season.poles} />
              </dl>
              {!seasonStarted ? (
                <p className="body-xs mt-4 font-semibold text-text-3">
                  The season hasn&apos;t started yet — numbers update after every race.
                </p>
              ) : null}
            </>
          ) : (
            <p className="body-s mt-4 text-text-3">No season entry on record yet.</p>
          )}

          <p className="display-s mt-10 font-medium uppercase text-text-3">Career</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            <StatCard
              label="Grands Prix Entered"
              value={
                driver.career.grandsPrixEntered > 0 ? driver.career.grandsPrixEntered : "—"
              }
            />
            <StatCard
              label="Career Points"
              value={driver.career.careerPoints > 0 ? driver.career.careerPoints : "—"}
            />
            <StatCard label="Wins" value={driver.career.wins} />
            <StatCard label="Podiums" value={driver.career.podiums} />
            <StatCard label="Poles" value={driver.career.poles} />
            <StatCard
              label="Best Finish"
              value={driver.career.bestFinish != null ? `P${driver.career.bestFinish}` : "—"}
            />
          </dl>
        </div>
      </section>

      {/* ── Biography ────────────────────────────────────────────────────── */}
      <section className="bg-surface-1">
        <div className="f1-inner py-12 lg:py-16">
          <div className="text-brand">
            <RacingLine className="max-w-40" />
          </div>
          <h2 className="display-xl lg:display-2xl mt-2 font-black uppercase text-text-5">
            Biography
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-3">
              <FactCard
                label="Date of Birth"
                value={
                  <>
                    {formatDate(driver.dateOfBirth)}
                    {age != null ? (
                      <span className="body-s font-semibold text-text-3">({age})</span>
                    ) : null}
                  </>
                }
              />
              <FactCard
                label="Place of Birth"
                value={
                  <>
                    {driver.placeOfBirth ?? "—"}
                    <CountryFlag code={driver.countryCode} className="text-base" />
                  </>
                }
              />
            </div>
            <div className="lg:col-span-2">
              {driver.biography ? (
                <div className="body-m flex max-w-[680px] flex-col gap-4 text-text-4">
                  {driver.biography
                    .split(/\n+/)
                    .filter(Boolean)
                    .map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                </div>
              ) : (
                <p className="body-s text-text-3">Biography coming soon.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Teammates ────────────────────────────────────────────────────── */}
      {driver.teammates.length ? (
        <section className="bg-surface-2">
          <div className="f1-inner py-12 lg:py-16">
            <h2 className="display-xl lg:display-2xl font-black uppercase text-text-5">
              Teammates
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
              {driver.teammates.map((mate) => (
                <Link
                  key={mate.slug}
                  href={`/drivers/${mate.slug}`}
                  className="race-line group flex items-center gap-4 overflow-clip rounded-md border border-surface-4 bg-surface-1 p-4"
                >
                  <DriverRoundel headshotPath={mate.headshotPath} color={teamColor} />
                  <span
                    className="font-digits text-2xl font-bold leading-none"
                    style={{ color: teamDark }}
                  >
                    {mate.carNumber}
                  </span>
                  <span className="min-w-0">
                    <span className="display-s block font-normal text-text-3">
                      {mate.firstName}
                    </span>
                    <span className="display-m block font-medium uppercase text-text-5 group-hover:underline">
                      {mate.lastName}
                    </span>
                  </span>
                  <span className="body-xs ml-auto font-bold uppercase text-text-3">
                    {mate.code}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
