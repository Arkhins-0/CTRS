import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag } from "@ctr/ui";
import { DriverRoundel } from "@/components/racing/category-ui";
import { readableOn, shadeHex } from "@/components/racing/colors";
import { getTeamDetail } from "@/components/racing/data";
import { FactCard, HalftoneWash, StatCard } from "@/components/racing/profile-ui";
import { RacingLine } from "@/components/racing/racing-line";
import { mediaUrl } from "@/lib/media";
import { getCurrentSeasonYear } from "@/lib/settings";

/* ── Team profile — F1.com-style: white ground, giant black team name with
   driver chips, the logo on a compact team-colour halftone panel, white
   stat/driver cards instead of full-bleed team-gradient bands. ───────────── */

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const currentYear = await getCurrentSeasonYear();
  const team = await getTeamDetail(slug, currentYear);
  if (!team) return {};
  return {
    title: team.shortName ?? team.name,
    description: `${team.fullName ?? team.name} — team profile, drivers and standings in the CTR–JK Tyre FMSCI Indian National Car Racing Championship.`,
  };
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const currentYear = await getCurrentSeasonYear();
  const team = await getTeamDetail(slug, currentYear);
  if (!team) notFound();

  const name = team.shortName ?? team.name;
  const color = team.color;
  const fg = readableOn(color);
  const teamDark = shadeHex(color, -0.35);
  const logo = mediaUrl(team.logoPath);
  const allDrivers = team.groups.flatMap((g) => g.drivers);

  return (
    <main>
      {/* ── Hero: identity left, halftone logo panel right ────────────────── */}
      <section className="bg-surface-1">
        <div className="f1-inner grid items-center gap-8 py-8 lg:grid-cols-[1fr_auto] lg:py-12">
          <div className="min-w-0">
            <p className="body-xs flex items-center gap-2 font-semibold uppercase text-text-3">
              <CountryFlag code={team.countryCode ?? "IN"} className="text-base leading-none" />
              {team.base ?? "India"}
            </p>
            <h1 className="display-4xl lg:display-5xl mt-3 font-black uppercase text-text-5">
              {name}
            </h1>
            {team.fullName && team.fullName !== name ? (
              <p className="body-s mt-2 font-semibold text-text-3">{team.fullName}</p>
            ) : null}

            {/* driver chips — headshot roundel + name, straight into the
                driver pages (the F1 team-page line-up strip) */}
            {allDrivers.length ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {allDrivers.map((d) => (
                  <Link
                    key={d.slug}
                    href={`/drivers/${d.slug}`}
                    className="flex items-center gap-2 rounded-full border border-surface-4 bg-surface-1 py-1 pl-1 pr-3 transition-colors hover:bg-black/5"
                  >
                    <DriverRoundel headshotPath={d.headshotPath} color={color} />
                    <span className="body-xs font-bold text-text-5">
                      {d.firstName} {d.lastName}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {/* logo panel — team colour + halftone */}
          <div
            className="relative flex h-56 w-full items-center justify-center overflow-hidden rounded-lg sm:w-[340px] lg:h-72 lg:w-[400px]"
            style={{ backgroundColor: color, color: fg }}
          >
            <HalftoneWash fg={fg} />
            {logo ? (
              <span className="relative h-36 w-36 lg:h-44 lg:w-44">
                <Image src={logo} alt={name} fill sizes="176px" className="object-contain" priority />
              </span>
            ) : (
              <span
                className="flex h-24 w-24 items-center justify-center rounded-full font-display text-3xl font-black"
                style={{ backgroundColor: teamDark, color: readableOn(teamDark) }}
              >
                {name.slice(0, 3).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        {/* team-colour accent strip closing the hero, F1-style */}
        <div aria-hidden className="h-1.5" style={{ backgroundColor: color }} />
      </section>

      {/* ── Line-up: light band, white driver cards per category ──────────── */}
      {team.groups.length ? (
        <section className="bg-surface-2">
          <div className="f1-inner flex flex-col gap-10 py-12 lg:py-16">
            <h2 className="display-xl lg:display-2xl font-black uppercase text-text-5">
              {team.seasonYear} Line-up
            </h2>
            {team.groups.map((group) => (
              <div key={group.category.slug}>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group.category.color }}
                  />
                  <h3 className="display-l font-medium uppercase text-text-5">
                    {group.category.name}
                  </h3>
                  {group.standing ? (
                    <span className="rounded-sm bg-black/10 px-2 py-1 text-[11px] font-bold uppercase leading-4 text-text-5">
                      P{group.standing.position} · {group.standing.points} pts
                    </span>
                  ) : null}
                </div>
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6 xl:grid-cols-4">
                  {group.drivers.map((d) => {
                    const shot = mediaUrl(d.headshotPath);
                    const initials =
                      `${d.firstName[0] ?? ""}${d.lastName[0] ?? ""}`.toUpperCase();
                    return (
                      <Link
                        key={d.slug}
                        href={`/drivers/${d.slug}`}
                        className="race-line group flex justify-between gap-3 overflow-clip rounded-md border border-surface-4 bg-surface-1 p-4"
                      >
                        <div className="flex min-w-0 flex-col">
                          <p className="display-l font-normal text-text-4">{d.firstName}</p>
                          <p className="display-l font-bold uppercase text-text-5 group-hover:underline">
                            {d.lastName}
                          </p>
                          <p
                            className="font-digits mt-2 text-2xl font-bold leading-none"
                            style={{ color: teamDark }}
                          >
                            {d.carNumber}
                          </p>
                          <span className="flex-1" aria-hidden />
                          <CountryFlag code={d.countryCode} className="text-xl leading-none" />
                        </div>
                        {/* headshot on a team-colour halftone tile */}
                        <span
                          className="relative h-36 w-28 shrink-0 self-end overflow-hidden rounded-md"
                          style={{ backgroundColor: color, color: fg }}
                        >
                          <HalftoneWash fg={fg} />
                          {shot ? (
                            <Image
                              src={shot}
                              alt={`${d.firstName} ${d.lastName}`}
                              fill
                              sizes="112px"
                              className="card-img object-cover object-top"
                            />
                          ) : (
                            <span
                              aria-hidden
                              className="absolute inset-0 flex items-center justify-center font-display text-3xl font-black opacity-60"
                            >
                              {initials}
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Team profile: stat cards + description ───────────────────────── */}
      <section className="bg-surface-1">
        <div className="f1-inner py-12 lg:py-16">
          <div className="text-brand">
            <RacingLine className="max-w-40" />
          </div>
          <h2 className="display-xl lg:display-2xl mt-2 font-black uppercase text-text-5">
            Team Profile
          </h2>
          <dl className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {team.fullName ? <FactCard label="Full Team Name" value={team.fullName} /> : null}
            {team.base ? <FactCard label="Base" value={team.base} /> : null}
            {team.teamPrincipal ? (
              <FactCard label="Team Principal" value={team.teamPrincipal} />
            ) : null}
            {team.firstEntryYear ? (
              <StatCard label="First Entry" value={team.firstEntryYear} />
            ) : null}
            <StatCard label="Drivers" value={allDrivers.length} />
          </dl>
          {team.description ? (
            <div className="body-m mt-8 flex max-w-[680px] flex-col gap-4 text-text-4">
              {team.description
                .split(/\n+/)
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
