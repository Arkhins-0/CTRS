import type { CSSProperties } from "react";
import { differenceInYears, parseISO } from "date-fns";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag } from "@ctr/ui";
import { CategoryBadge } from "@/components/racing/category-ui";
import { shadeHex } from "@/components/racing/colors";
import { getDriverDetail } from "@/components/racing/data";
import { formatDate } from "@/components/racing/meta";
import { RacingLine } from "@/components/racing/racing-line";
import { mediaUrl } from "@/lib/media";

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

/** Label-over-value row used in the season data grid. */
function SeasonStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-3">
      <dt className="body-xs font-semibold text-text-3">{label}</dt>
      <dd className="display-l lg:display-xl font-medium text-text-5">{value}</dd>
    </div>
  );
}

function CareerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-surface-6 py-3 last:border-0">
      <dt className="body-xs font-semibold text-static-5">{label}</dt>
      <dd className="display-l font-medium text-white">{value}</dd>
    </div>
  );
}

export default async function DriverPage({ params }: Props) {
  const { slug } = await params;
  const driver = await getDriverDetail(slug);
  if (!driver) notFound();

  const fullName = `${driver.firstName} ${driver.lastName}`;
  const headshot = mediaUrl(driver.headshotPath);
  const teamColor = driver.current?.teamColor ?? "#67676d";
  const teamDark = shadeHex(teamColor, -0.45);
  const initials =
    `${driver.firstName[0] ?? ""}${driver.lastName[0] ?? ""}`.toUpperCase();
  const age = driver.dateOfBirth
    ? differenceInYears(new Date(), parseISO(driver.dateOfBirth))
    : null;
  const seasonStarted = (driver.season?.computedThroughRound ?? 0) > 0;

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-clip"
        style={{ "--team": teamColor, backgroundColor: teamColor } as CSSProperties}
      >
        <div className="text-white/70">
          <RacingLine />
        </div>
        <div className="f1-inner grid items-end gap-8 py-8 lg:grid-cols-2 lg:py-12">
          {/* identity */}
          <div className="relative z-10 min-w-0 text-white">
            <div className="flex flex-wrap items-center gap-2">
              {driver.current?.category ? (
                <CategoryBadge
                  category={driver.current.category}
                  className="border-white/70 text-white"
                />
              ) : null}
              <CountryFlag code={driver.countryCode} className="text-xl" />
              <span className="body-xs font-bold uppercase text-white/80">{driver.code}</span>
            </div>
            <p className="font-script mt-4 text-5xl leading-none lg:text-7xl">
              {driver.firstName}
            </p>
            <h1 className="display-3xl lg:display-4xl -mt-1 font-black uppercase">
              {driver.lastName}
            </h1>
            <div className="body-s mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">
              {driver.current ? (
                <>
                  <Link
                    href={`/teams/${driver.current.teamSlug}`}
                    className="hover:underline"
                  >
                    {driver.current.teamName}
                  </Link>
                  <span aria-hidden className="text-white/50">
                    ·
                  </span>
                  <span className="font-digits text-xl font-bold leading-none">
                    {driver.current.carNumber}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          {/* number + headshot */}
          <div className="relative flex min-h-[220px] items-end justify-center lg:justify-end">
            {driver.current ? (
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-0 right-0 select-none font-display text-[9rem] font-black leading-none lg:text-[13rem]"
                style={{ color: teamDark }}
              >
                {driver.current.carNumber}
              </span>
            ) : null}
            <div className="relative h-56 w-48 overflow-hidden rounded-md lg:h-72 lg:w-64">
              {headshot ? (
                <Image
                  src={headshot}
                  alt={fullName}
                  fill
                  sizes="256px"
                  className="object-cover object-top"
                  priority
                />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center font-display text-6xl font-black text-white/25"
                  style={{ backgroundColor: teamDark }}
                >
                  {initials}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-white/70">
          <RacingLine />
        </div>
      </section>

      {/* ── Statistics (dark band) ───────────────────────────────────────── */}
      <section className="dark-section bg-surface-3">
        <div className="f1-inner py-12 lg:py-16">
          <h2 className="display-xl lg:display-2xl font-black uppercase text-text-5">
            Statistics
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="display-s font-medium uppercase text-text-3">
                {driver.season?.year ?? driver.current?.seasonYear ?? ""} Season
                {driver.current?.category ? ` · ${driver.current.category.shortName}` : ""}
              </p>
              {driver.season ? (
                <dl className="mt-4">
                  <SeasonStat
                    label="Position"
                    value={
                      seasonStarted && driver.season.position != null
                        ? `P${driver.season.position}`
                        : "—"
                    }
                  />
                  <SeasonStat label="Points" value={String(driver.season.points)} />
                  <SeasonStat label="Races" value={String(driver.season.races)} />
                  <SeasonStat label="Wins" value={String(driver.season.wins)} />
                  <SeasonStat label="Podiums" value={String(driver.season.podiums)} />
                  <SeasonStat label="Poles" value={String(driver.season.poles)} />
                </dl>
              ) : (
                <p className="body-s mt-4 text-text-3">No season entry on record yet.</p>
              )}
              {driver.season && !seasonStarted ? (
                <p className="body-xs mt-4 font-semibold text-text-3">
                  The season hasn&apos;t started yet — numbers update after every race.
                </p>
              ) : null}
            </div>

            <div className="rounded-lg bg-static-8 p-6">
              <p className="display-s font-medium uppercase text-static-5">Career Stats</p>
              <dl className="mt-4">
                <CareerRow
                  label="Grands Prix Entered"
                  value={
                    driver.career.grandsPrixEntered > 0
                      ? String(driver.career.grandsPrixEntered)
                      : "—"
                  }
                />
                <CareerRow
                  label="Career Points"
                  value={
                    driver.career.careerPoints > 0 ? String(driver.career.careerPoints) : "—"
                  }
                />
                <CareerRow label="Wins" value={String(driver.career.wins)} />
                <CareerRow label="Podiums" value={String(driver.career.podiums)} />
                <CareerRow label="Poles" value={String(driver.career.poles)} />
                <CareerRow
                  label="Best Finish"
                  value={driver.career.bestFinish != null ? `P${driver.career.bestFinish}` : "—"}
                />
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ── Biography (warm band) ────────────────────────────────────────── */}
      <section className="bg-surface-3">
        <div className="f1-inner py-12 lg:py-16">
          <div className="text-brand">
            <RacingLine className="max-w-40" />
          </div>
          <h2 className="display-xl lg:display-2xl mt-2 font-black uppercase text-text-5">
            Biography
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-4">
              <div className="rounded-md bg-surface-1 p-4">
                <p className="body-xs font-semibold uppercase text-text-3">Date of Birth</p>
                <p className="display-l mt-1 font-medium text-text-5">
                  {formatDate(driver.dateOfBirth)}
                  {age != null ? (
                    <span className="body-s ml-2 font-semibold text-text-3">({age})</span>
                  ) : null}
                </p>
              </div>
              <div className="rounded-md bg-surface-1 p-4">
                <p className="body-xs font-semibold uppercase text-text-3">Place of Birth</p>
                <p className="display-l mt-1 flex items-center gap-2 font-medium text-text-5">
                  {driver.placeOfBirth ?? "—"}
                  <CountryFlag code={driver.countryCode} className="text-base" />
                </p>
              </div>
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
        <section className="bg-surface-1">
          <div className="f1-inner py-12 lg:py-16">
            <h2 className="display-xl lg:display-2xl font-black uppercase text-text-5">
              Teammates
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {driver.teammates.map((mate) => (
                <Link
                  key={mate.slug}
                  href={`/drivers/${mate.slug}`}
                  className="group flex items-center gap-4 rounded-md bg-surface-3 p-4"
                >
                  <span
                    aria-hidden
                    className="h-10 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: teamColor }}
                  />
                  <span className="font-digits text-2xl font-bold leading-none text-text-3">
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
