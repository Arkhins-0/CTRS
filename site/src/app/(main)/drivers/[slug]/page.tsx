import { differenceInYears, parseISO } from "date-fns";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag } from "@ctr/ui";
import { CategoryBadge } from "@/components/racing/category-ui";
import { teamGradient } from "@/components/racing/colors";
import { getDriverDetail } from "@/components/racing/data";
import { formatDate } from "@/components/racing/meta";
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

function SeasonStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="chamfer-tr border border-line bg-panel/60 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-faint">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-white">{value}</p>
    </div>
  );
}

function CareerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-xs font-bold uppercase tracking-wider text-fg-faint">{label}</dt>
      <dd className="text-lg font-black tabular-nums text-white">{value}</dd>
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
  const initials =
    `${driver.firstName[0] ?? ""}${driver.lastName[0] ?? ""}`.toUpperCase();
  const age = driver.dateOfBirth
    ? differenceInYears(new Date(), parseISO(driver.dateOfBirth))
    : null;
  const seasonStarted = (driver.season?.computedThroughRound ?? 0) > 0;

  return (
    <div className="bg-page">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Hero band in the team colour */}
        <section
          className="chamfer-tr-lg relative overflow-hidden border border-line"
          style={teamGradient(teamColor)}
        >
          <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {driver.current?.category ? (
                  <CategoryBadge category={driver.current.category} className="bg-page/40" />
                ) : null}
                <CountryFlag code={driver.countryCode} className="text-xl" />
                <span className="text-xs font-black uppercase tracking-[0.25em] text-white/70">
                  {driver.code}
                </span>
              </div>
              <p
                className="mt-4 text-3xl font-light italic text-white/85 sm:text-4xl"
                style={{ fontFamily: "Georgia, 'Palatino Linotype', 'Times New Roman', serif" }}
              >
                {driver.firstName}
              </p>
              <h1 className="text-5xl font-black uppercase leading-none tracking-tight text-white sm:text-7xl">
                {driver.lastName}
              </h1>
              {driver.current ? (
                <p className="mt-4 text-sm font-bold uppercase tracking-wider text-white/80">
                  <Link
                    href={`/teams/${driver.current.teamSlug}`}
                    className="hover:text-white hover:underline"
                  >
                    {driver.current.teamName}
                  </Link>
                  {driver.current.category ? ` · ${driver.current.category.name}` : ""}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-end gap-6">
              {driver.current ? (
                <span
                  aria-label={`Car number ${driver.current.carNumber}`}
                  className="text-8xl font-black italic leading-none sm:text-9xl"
                  style={{
                    WebkitTextStroke: "3px rgba(255,255,255,0.9)",
                    color: "transparent",
                  }}
                >
                  {driver.current.carNumber}
                </span>
              ) : null}
              <div className="chamfer-tr relative h-40 w-36 overflow-hidden bg-page/30 sm:h-48 sm:w-44">
                {headshot ? (
                  <Image
                    src={headshot}
                    alt={fullName}
                    fill
                    sizes="176px"
                    className="object-cover object-top"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-6xl font-black tracking-tighter text-white/25">
                    {initials}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="mt-10">
          <h2 className="border-l-4 border-accent pl-3 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
            Statistics
          </h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {/* Season panel */}
            <div className="chamfer-tr border border-line bg-surface p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-fg-faint">
                {driver.season?.year ?? driver.current?.seasonYear ?? ""} Season
                {driver.current?.category ? ` · ${driver.current.category.shortName}` : ""}
              </p>
              {driver.season ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                </div>
              ) : (
                <p className="mt-4 text-sm text-fg-muted">No season entry on record yet.</p>
              )}
              {driver.season && !seasonStarted ? (
                <p className="mt-4 text-xs font-semibold text-fg-faint">
                  The season hasn&apos;t started yet — numbers update after every race.
                </p>
              ) : null}
            </div>

            {/* Career card */}
            <div className="chamfer-tr bg-panel p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-fg-faint">
                Career Stats
              </p>
              <dl className="mt-2 divide-y divide-line">
                <CareerRow
                  label="Grands Prix Entered"
                  value={driver.career.grandsPrixEntered > 0 ? String(driver.career.grandsPrixEntered) : "—"}
                />
                <CareerRow
                  label="Career Points"
                  value={driver.career.careerPoints > 0 ? String(driver.career.careerPoints) : "—"}
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
        </section>

        {/* Biography */}
        <section className="mt-10">
          <h2 className="border-l-4 border-accent pl-3 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
            Biography
          </h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="space-y-3">
              <div className="chamfer-tr border border-line bg-surface p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fg-faint">
                  Date of Birth
                </p>
                <p className="mt-1 text-lg font-black text-white">
                  {formatDate(driver.dateOfBirth)}
                  {age != null ? (
                    <span className="ml-2 text-sm font-bold text-fg-muted">({age})</span>
                  ) : null}
                </p>
              </div>
              <div className="chamfer-tr border border-line bg-surface p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fg-faint">
                  Place of Birth
                </p>
                <p className="mt-1 flex items-center gap-2 text-lg font-black text-white">
                  {driver.placeOfBirth ?? "—"}
                  <CountryFlag code={driver.countryCode} className="text-base" />
                </p>
              </div>
            </div>
            <div className="lg:col-span-2">
              {driver.biography ? (
                <div className="space-y-4 text-sm leading-relaxed text-fg-muted">
                  {driver.biography
                    .split(/\n+/)
                    .filter(Boolean)
                    .map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-fg-faint">Biography coming soon.</p>
              )}
            </div>
          </div>
        </section>

        {/* Teammates */}
        {driver.teammates.length ? (
          <section className="mt-10">
            <h2 className="border-l-4 border-accent pl-3 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
              Teammates
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {driver.teammates.map((mate) => (
                <Link key={mate.slug} href={`/drivers/${mate.slug}`} className="group block">
                  <div
                    className="chamfer-tr flex items-center gap-4 border border-line border-t-4 bg-surface p-4 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-accent"
                    style={{ borderTopColor: teamColor }}
                  >
                    <span className="text-3xl font-black italic leading-none text-fg-faint">
                      {mate.carNumber}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-fg-muted">
                        {mate.firstName}
                      </span>
                      <span className="block text-lg font-black uppercase tracking-tight text-white group-hover:text-accent">
                        {mate.lastName}
                      </span>
                    </span>
                    <span className="ml-auto text-sm font-bold uppercase text-fg-faint">
                      {mate.code}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
