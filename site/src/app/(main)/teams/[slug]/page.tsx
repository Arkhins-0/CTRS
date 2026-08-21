import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag } from "@ctr/ui";
import { readableOn, shadeHex } from "@/components/racing/colors";
import { getTeamDetail } from "@/components/racing/data";
import { RacingLine } from "@/components/racing/racing-line";
import { mediaUrl } from "@/lib/media";
import { getCurrentSeasonYear } from "@/lib/settings";

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

/** Profile info cell (label over value) used in the 2→4 column data grid. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-black/10 pt-3">
      <p className="body-xs font-semibold uppercase text-text-3">{label}</p>
      <p className="display-l mt-1 font-medium text-text-5">{value}</p>
    </div>
  );
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const currentYear = await getCurrentSeasonYear();
  const team = await getTeamDetail(slug, currentYear);
  if (!team) notFound();

  const name = team.shortName ?? team.name;
  const teamDark = shadeHex(team.color, -0.45);
  const fg = readableOn(team.color);
  const allDrivers = team.groups.flatMap((g) => g.drivers);

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-clip"
        style={{ "--team": team.color, backgroundColor: team.color } as CSSProperties}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-1/2"
          style={{ background: `linear-gradient(0deg, ${teamDark}, transparent)` }}
        />
        <div style={{ color: fg, opacity: 0.7 }}>
          <RacingLine />
        </div>
        <div
          className="f1-inner relative z-10 flex flex-col items-center gap-4 py-10 text-center lg:py-14"
          style={{ color: fg }}
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: teamDark }}
          >
            <span className="font-display text-xl font-medium text-white">
              {name.slice(0, 3).toUpperCase()}
            </span>
          </span>
          <h1 className="display-3xl lg:display-4xl font-black uppercase">{name}</h1>
          {team.fullName ? (
            <p className="body-s font-semibold opacity-80">{team.fullName}</p>
          ) : null}
          {allDrivers.length ? (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              {allDrivers.map((d, i) => (
                <span key={d.slug} className="flex items-center gap-4">
                  {i > 0 ? (
                    <span aria-hidden className="h-4 w-px bg-current opacity-30" />
                  ) : null}
                  <span className="display-m font-medium uppercase">
                    {d.firstName} {d.lastName}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
          <p className="body-xs mt-1 flex items-center gap-2 font-semibold opacity-80">
            <CountryFlag code={team.countryCode ?? "IN"} />
            {team.base ?? "India"}
          </p>
        </div>
        <div style={{ color: fg, opacity: 0.7 }}>
          <RacingLine />
        </div>
      </section>

      {/* ── Drivers (dark band) ──────────────────────────────────────────── */}
      {team.groups.length ? (
        <section className="dark-section bg-surface-3">
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
                    <span className="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-bold uppercase leading-4 text-text-5">
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
                        className="group relative z-0 grid min-h-[256px] grid-cols-2 grid-rows-[1fr_112px] overflow-clip rounded-md p-4 text-white"
                        style={
                          {
                            "--team": team.color,
                            backgroundColor: teamDark,
                          } as CSSProperties
                        }
                      >
                        <span
                          aria-hidden
                          className="drs pointer-events-none absolute inset-y-0 -right-8 z-0 w-3/4 opacity-30"
                        />
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-y-0 left-0 z-0 w-3/4"
                          style={{
                            background: `linear-gradient(269.74deg, transparent 20%, ${teamDark} 90%)`,
                          }}
                        />
                        <div className="relative z-10 min-h-[112px]">
                          <p className="display-l font-normal group-hover:underline">
                            {d.firstName}
                          </p>
                          <p className="display-l font-medium group-hover:underline">
                            {d.lastName}
                          </p>
                          <p className="body-xs pb-4 pt-1 font-semibold">{name}</p>
                          <p className="font-digits text-2xl font-bold leading-none">
                            {d.carNumber}
                          </p>
                        </div>
                        <div aria-hidden />
                        <div className="relative z-10 flex items-end justify-start">
                          {d.countryCode ? (
                            <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-white text-[13px] leading-none">
                              <CountryFlag code={d.countryCode} />
                            </span>
                          ) : null}
                        </div>
                        <div className="relative">
                          {shot ? (
                            <Image
                              src={shot}
                              alt={`${d.firstName} ${d.lastName}`}
                              width={220}
                              height={224}
                              sizes="(max-width: 735px) 50vw, 220px"
                              className="absolute -top-28 right-0 h-56 w-[150px] rounded-md object-cover object-top"
                            />
                          ) : (
                            <span
                              aria-hidden
                              className="absolute -top-24 right-0 select-none font-display text-8xl font-black leading-none text-white/10"
                            >
                              {initials}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Profile (warm band) ──────────────────────────────────────────── */}
      <section className="bg-surface-3">
        <div className="f1-inner py-12 lg:py-16">
          <div className="text-brand">
            <RacingLine className="max-w-40" />
          </div>
          <h2 className="display-xl lg:display-2xl mt-2 font-black uppercase text-text-5">
            Team Profile
          </h2>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
            {team.fullName ? <Fact label="Full Team Name" value={team.fullName} /> : null}
            {team.base ? <Fact label="Base" value={team.base} /> : null}
            {team.teamPrincipal ? (
              <Fact label="Team Principal" value={team.teamPrincipal} />
            ) : null}
            {team.firstEntryYear ? (
              <Fact label="First Entry" value={String(team.firstEntryYear)} />
            ) : null}
            <Fact label="Drivers" value={String(allDrivers.length)} />
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
