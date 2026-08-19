import { differenceInYears, parseISO } from "date-fns";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag, SectionHeading } from "@ctr/ui";
import { getDriverDetail } from "@/components/racing/data";
import { formatDate } from "@/components/racing/meta";
import { mediaUrl, placeholderStyle } from "@/lib/media";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const driver = await getDriverDetail(slug);
  if (!driver) return {};
  return {
    title: `${driver.firstName} ${driver.lastName}`,
    description: `${driver.firstName} ${driver.lastName} — profile, career statistics and season results.`,
  };
}

const STATUS_SHORT: Record<string, string> = { dnf: "DNF", dns: "DNS", dsq: "DSQ", nc: "NC" };

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="chamfer-tr border border-warm-grey bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-f1-grey">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-carbon">{value}</p>
    </div>
  );
}

const th = "px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider";
const td = "px-3 py-2.5";

export default async function DriverPage({ params }: Props) {
  const { slug } = await params;
  const driver = await getDriverDetail(slug);
  if (!driver) notFound();

  const fullName = `${driver.firstName} ${driver.lastName}`;
  const headshot = mediaUrl(driver.headshotPath);
  const teamColor = driver.current?.teamColor ?? "#67676d";
  const age = driver.dateOfBirth ? differenceInYears(new Date(), parseISO(driver.dateOfBirth)) : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <section
        className="chamfer-tr-lg bg-carbon-fibre text-white"
        style={{ borderTop: `6px solid ${teamColor}` }}
      >
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-8">
          <div className="relative h-40 w-40 shrink-0 overflow-hidden chamfer-tr sm:h-48 sm:w-48">
            {headshot ? (
              <Image
                src={headshot}
                alt={fullName}
                fill
                sizes="192px"
                className="object-cover object-top"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={placeholderStyle(fullName)}
              >
                <span className="text-4xl font-black uppercase tracking-widest text-white/70">
                  {driver.code}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {driver.current ? (
              <p
                className="text-4xl font-black italic leading-none sm:text-6xl"
                style={{ color: teamColor }}
              >
                {driver.current.carNumber}
              </p>
            ) : null}
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-5xl">
              <span className="font-medium">{driver.firstName}</span> {driver.lastName}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-3 text-sm font-bold uppercase tracking-wide text-f1-grey-light">
              <CountryFlag code={driver.countryCode} className="text-xl" />
              <span>{driver.code}</span>
              {driver.current ? (
                <Link
                  href={`/teams/${driver.current.teamSlug}`}
                  className="text-white hover:text-f1-red"
                >
                  {driver.current.teamName}
                </Link>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      {/* Bio + info grid */}
      <section className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {driver.biography ? (
            <>
              <SectionHeading>Biography</SectionHeading>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-carbon">
                {driver.biography
                  .split(/\n+/)
                  .filter(Boolean)
                  .map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
              </div>
            </>
          ) : null}
        </div>
        <div>
          <SectionHeading>Info</SectionHeading>
          <dl className="chamfer-tr mt-4 divide-y divide-warm-grey border border-warm-grey bg-white text-sm">
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="font-bold uppercase tracking-wider text-f1-grey">Team</dt>
              <dd className="font-semibold text-carbon">{driver.current?.teamName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="font-bold uppercase tracking-wider text-f1-grey">Country</dt>
              <dd className="flex items-center gap-2 font-semibold text-carbon">
                <CountryFlag code={driver.countryCode} />
                {driver.countryCode?.toUpperCase() ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="font-bold uppercase tracking-wider text-f1-grey">Date of Birth</dt>
              <dd className="font-semibold text-carbon">
                {formatDate(driver.dateOfBirth)}
                {age != null ? ` (${age})` : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="font-bold uppercase tracking-wider text-f1-grey">Place of Birth</dt>
              <dd className="text-right font-semibold text-carbon">{driver.placeOfBirth ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Career stats */}
      <section className="mt-10">
        <SectionHeading>Career Statistics</SectionHeading>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Grands Prix" value={String(driver.stats.grandsPrixEntered)} />
          <StatTile label="Career Points" value={String(driver.stats.careerPoints)} />
          <StatTile label="Wins" value={String(driver.stats.wins)} />
          <StatTile label="Podiums" value={String(driver.stats.podiums)} />
          <StatTile label="Poles" value={String(driver.stats.poles)} />
          <StatTile
            label="Best Finish"
            value={driver.stats.bestFinish != null ? `P${driver.stats.bestFinish}` : "—"}
          />
        </div>
      </section>

      {/* Latest season results */}
      {driver.seasonTable && driver.seasonTable.rows.length ? (
        <section className="mt-10">
          <SectionHeading
            right={
              <Link
                href={`/results/${driver.seasonTable.seasonYear}`}
                className="text-f1-red hover:text-f1-red-dark"
              >
                All {driver.seasonTable.seasonYear} Results →
              </Link>
            }
          >
            {driver.seasonTable.seasonYear} Season
          </SectionHeading>
          <div className="chamfer-tr mt-4 overflow-x-auto border border-warm-grey bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="bg-carbon text-white">
                  <th className={`${th} w-16`}>Round</th>
                  <th className={th}>Grand Prix</th>
                  <th className={`${th} text-right`}>Grid</th>
                  <th className={`${th} text-right`}>Finish</th>
                  <th className={`${th} text-right`}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {driver.seasonTable.rows.map((row) => (
                  <tr
                    key={row.round}
                    className="border-b border-warm-grey last:border-0 hover:bg-off-white"
                  >
                    <td className={`${td} font-black text-carbon`}>{row.round}</td>
                    <td className={td}>
                      <Link
                        href={`/results/${row.seasonYear}/${row.gpSlug}/race`}
                        className="font-semibold text-carbon hover:text-f1-red"
                      >
                        {row.gpName}
                      </Link>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>
                      {row.gridPosition != null ? `P${row.gridPosition}` : "—"}
                    </td>
                    <td className={`${td} text-right font-bold tabular-nums text-carbon`}>
                      {row.position != null ? `P${row.position}` : (STATUS_SHORT[row.status] ?? "—")}
                    </td>
                    <td className={`${td} text-right font-black tabular-nums text-carbon`}>
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
