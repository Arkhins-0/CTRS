import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag } from "@ctr/ui";
import { CategoryBadge } from "@/components/racing/category-ui";
import { teamGradient } from "@/components/racing/colors";
import { getTeamDetail } from "@/components/racing/data";
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

function FactTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="chamfer-tr border border-line bg-surface p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fg-faint">{label}</p>
      <p className="mt-1 text-xl font-black tracking-tight text-white">{value}</p>
    </div>
  );
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const currentYear = await getCurrentSeasonYear();
  const team = await getTeamDetail(slug, currentYear);
  if (!team) notFound();

  return (
    <div className="bg-page">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Hero band in the team colour */}
        <section
          className="chamfer-tr-lg relative overflow-hidden border border-line"
          style={teamGradient(team.color)}
        >
          <div className="relative z-10 p-6 sm:p-10">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
              <CountryFlag code={team.countryCode ?? "IN"} />
              {team.base ?? "India"}
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
              {team.shortName ?? team.name}
            </h1>
            {team.fullName ? (
              <p className="mt-1 text-sm font-semibold text-white/75">{team.fullName}</p>
            ) : null}
            {team.groups.length ? (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {team.groups.map((g) => (
                  <CategoryBadge
                    key={g.category.slug}
                    category={g.category}
                    className="bg-page/40"
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* Info tiles */}
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FactTile label="Base" value={team.base ?? "—"} />
          <FactTile label="Team Principal" value={team.teamPrincipal ?? "TBA"} />
          <FactTile
            label="First Entry"
            value={team.firstEntryYear != null ? String(team.firstEntryYear) : "—"}
          />
        </section>

        {team.description ? (
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-fg-muted">
            {team.description}
          </p>
        ) : null}

        {/* Per-category line-ups + standings */}
        {team.groups.length ? (
          <div className="mt-12 space-y-12">
            {team.groups.map((group) => {
              const standingsStarted = (group.standing?.computedThroughRound ?? 0) > 0;
              return (
                <section key={group.category.slug}>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2
                      className="border-l-4 pl-3 text-xl font-black uppercase tracking-tight text-white sm:text-2xl"
                      style={{ borderColor: group.category.color }}
                    >
                      {group.category.name}
                    </h2>
                    <CategoryBadge category={group.category} />
                    <Link
                      href={`/standings/${team.seasonYear}/constructors?category=${group.category.slug}`}
                      className="ml-auto text-xs font-black uppercase tracking-wider text-accent hover:text-accent-dark"
                    >
                      {standingsStarted && group.standing
                        ? `P${group.standing.position} · ${group.standing.points} pts`
                        : "Standings TBD"}{" "}
                      <span aria-hidden>→</span>
                    </Link>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {group.drivers.map((driver) => {
                      const headshot = mediaUrl(driver.headshotPath);
                      const initials =
                        `${driver.firstName[0] ?? ""}${driver.lastName[0] ?? ""}`.toUpperCase();
                      return (
                        <Link
                          key={driver.slug}
                          href={`/drivers/${driver.slug}`}
                          className="group block"
                        >
                          <article
                            className="chamfer-tr relative flex items-center gap-4 overflow-hidden border border-line border-t-4 bg-surface p-4 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-accent"
                            style={{ borderTopColor: team.color }}
                          >
                            <span className="text-3xl font-black italic leading-none text-fg-faint">
                              {driver.carNumber}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-fg-muted">
                                {driver.firstName}
                              </span>
                              <span className="flex items-center gap-2 truncate text-lg font-black uppercase tracking-tight text-white group-hover:text-accent">
                                {driver.lastName}
                                <CountryFlag
                                  code={driver.countryCode}
                                  className="text-base"
                                />
                              </span>
                            </span>
                            {headshot ? (
                              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm">
                                <Image
                                  src={headshot}
                                  alt=""
                                  fill
                                  sizes="48px"
                                  className="object-cover object-top"
                                />
                              </span>
                            ) : (
                              <span className="text-xl font-black tracking-tighter text-white/15">
                                {initials}
                              </span>
                            )}
                          </article>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <p className="chamfer-tr mt-10 border border-line bg-surface p-6 text-fg-muted">
            {team.name} has no confirmed entries for the {team.seasonYear} season yet.
          </p>
        )}
      </main>
    </div>
  );
}
