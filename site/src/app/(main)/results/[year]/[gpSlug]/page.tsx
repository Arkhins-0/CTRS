import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryFlag } from "@ctr/ui";
import { InlineCountdown } from "@/components/racing/countdown";
import {
  getGpDetail,
  getSeasonRounds,
  getSeasonYears,
  getSessionClassification,
  type GpSessionInfo,
} from "@/components/racing/data";
import {
  formatDate,
  formatDateRange,
  istDateKey,
  SESSION_ORDER,
  sessionDisplayLabel,
} from "@/components/racing/meta";
import { mediaUrl } from "@/lib/media";
import { ResultsHub } from "@/components/racing/results-hub";
import { FilterDropdown, ResultsTable } from "@/components/racing/results-table";

type Props = {
  params: Promise<{ year: string; gpSlug: string }>;
  searchParams: Promise<{ session?: string; category?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year: yearParam, gpSlug } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) return {};
  const gp = await getGpDetail(year, gpSlug);
  if (!gp) return {};
  return {
    title: `${gp.name} — Results`,
    description: `Classifications for every category and session of ${gp.name}, ${gp.seasonYear} CTR–JK Tyre FMSCI Indian National Car Racing Championship.`,
  };
}

export default async function RoundResultsPage({ params, searchParams }: Props) {
  const [{ year: yearParam, gpSlug }, { session: sessionParam, category: categoryParam }] =
    await Promise.all([params, searchParams]);
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const [gp, years, rounds] = await Promise.all([
    getGpDetail(year, gpSlug),
    getSeasonYears(),
    getSeasonRounds(year),
  ]);
  if (!gp) notFound();

  /* ── Session selection (searchParams-driven, server-rendered links) ──────
     ?session=<id> picks a classification directly; ?category=<slug> (legacy
     links) narrows the default. Fallback = the newest headline session with
     results (Race 2 → Race 1 → Qualifying → Practice, flagship class first). */
  const withResults = gp.sessions.filter((s) => s.hasResults);
  const newestFirst = [...withResults].sort(
    (a, b) =>
      SESSION_ORDER[b.type] - SESSION_ORDER[a.type] ||
      b.sequence - a.sequence ||
      (a.category?.sort ?? 999) - (b.category?.sort ?? 999),
  );
  const selected =
    withResults.find((s) => s.id === sessionParam) ??
    newestFirst.find((s) => s.category?.slug === categoryParam) ??
    newestFirst[0] ??
    null;

  const rows = selected ? await getSessionClassification(selected.id) : [];

  /* Session labels: the stored label ("ISC — Race 1") wins; when the weekend
     is multi-class and the label lacks the class, prefix its shortName. */
  const multiClass =
    new Set(withResults.map((s) => s.category?.id).filter(Boolean)).size > 1;
  const sessionLabel = (s: GpSessionInfo): string => {
    const label = sessionDisplayLabel(s);
    if (
      multiClass &&
      s.category &&
      !label.toLowerCase().includes(s.category.shortName.toLowerCase())
    ) {
      return `${s.category.shortName} — ${label}`;
    }
    return label;
  };

  const lightsOutDate = gp.firstRaceStartsAt
    ? istDateKey(gp.firstRaceStartsAt)
    : (gp.startDate ?? null);

  return (
    <ResultsHub
      year={year}
      years={years}
      active="races"
      title={gp.officialName ?? gp.name}
      filters={
        <>
          {/* Race selector — every round of the season */}
          <FilterDropdown
            ariaLabel="Choose a Grand Prix"
            label={gp.name}
            options={rounds.map((r) => ({
              key: r.id,
              label: (
                <>
                  <CountryFlag code={r.countryCode} className="text-base leading-none" />
                  {r.name}
                </>
              ),
              href: r.hasResults
                ? `/results/${year}/${r.slug}`
                : `/schedule/${year}/${r.slug}`,
              active: r.slug === gp.slug,
            }))}
          />
          {/* Session selector — this weekend's classifications */}
          {selected ? (
            <FilterDropdown
              ariaLabel="Choose a session"
              label={sessionLabel(selected)}
              options={withResults.map((s) => ({
                key: s.id,
                label: sessionLabel(s),
                href: `/results/${year}/${gp.slug}?session=${s.id}`,
                active: s.id === selected.id,
              }))}
            />
          ) : null}
          {/* Big country flag, right edge of the filter row (spec §5.1) */}
          <CountryFlag
            code={gp.circuit.countryCode}
            className="ml-auto text-4xl leading-none"
          />
        </>
      }
    >
      {/* Meta block under the H1: date range + circuit line (spec §5.2) */}
      <div className="-mt-3 mb-6 flex flex-col gap-1.5 text-text-3">
        <p className="display-s font-medium uppercase">
          {formatDateRange(gp.startDate, gp.endDate) || "Dates TBC"}
        </p>
        <p className="body-xs font-semibold">
          {gp.circuit.name}
          {gp.circuit.locality ? `, ${gp.circuit.locality}` : ""}
          {gp.circuit.country ? `, ${gp.circuit.country}` : ""}
        </p>
      </div>

      {selected ? (
        <>
          <ResultsTable rows={rows} sessionType={selected.type} />
          {/* Official signed classification — the authentic letterhead declaration */}
          {selected.declaration ? (
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-md bg-surface-1 px-6 py-5">
              <div className="min-w-0">
                <p className="body-s font-bold uppercase text-text-5">Official declaration</p>
                <p className="body-xs truncate text-text-3">
                  Signed classification issued by the race organisers —{" "}
                  {selected.declaration.filename}
                </p>
              </div>
              <a
                href={mediaUrl(selected.declaration.path) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-md btn-stroke ml-auto shrink-0"
              >
                Download PDF <span aria-hidden>↓</span>
              </a>
            </div>
          ) : null}
        </>
      ) : (
        /* Empty state: no classifications yet — countdown to lights out */
        <div className="flex flex-col items-start gap-4 rounded-md bg-surface-1 px-6 py-8 md:px-8 md:py-10">
          <p className="display-l font-black uppercase text-text-5">No results yet</p>
          <p className="body-s text-text-3">
            Lights out on {formatDate(lightsOutDate)} at {gp.circuit.name}
            {gp.circuit.locality ? `, ${gp.circuit.locality}` : ""}. Classifications
            will appear here as soon as the sessions run.
          </p>
          {gp.firstRaceStartsAt ? (
            <p className="body-s font-bold text-text-5">
              <InlineCountdown targetIso={gp.firstRaceStartsAt} />
            </p>
          ) : null}
          <Link href={`/schedule/${gp.seasonYear}/${gp.slug}`} className="btn btn-md btn-stroke">
            Weekend schedule <span aria-hidden>→</span>
          </Link>
        </div>
      )}
    </ResultsHub>
  );
}
