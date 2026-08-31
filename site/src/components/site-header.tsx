import Image from "next/image";
import Link from "next/link";
import { getFanSession } from "@/lib/fan-auth";
import { getSetting } from "@/lib/settings";
import {
  getGpDetail,
  getScheduleForSeason,
  getSeasonYears,
} from "@/components/racing/data";
import { sessionDisplayLabel } from "@/components/racing/meta";
import { EventTracker, type TrackerData } from "./event-tracker";
import { HeaderNav } from "./header-nav";

const DEFAULT_LINKS = [
  { label: "Latest", href: "/latest" },
  { label: "Video", href: "/video" },
  { label: "Schedule", href: "/schedule" },
  { label: "Results", href: "/results/2026" },
  { label: "Standings", href: "/standings/2026/drivers" },
  { label: "Drivers", href: "/drivers" },
  { label: "Teams", href: "/teams" },
];

/** Masthead quick links (bar 1, desktop only) + hamburger extras. */
const SECONDARY_LINKS = [
  { label: "News", href: "/latest" },
  { label: "Videos", href: "/video" },
  { label: "Polls", href: "/polls" },
  { label: "Newsletter", href: "/newsletter" },
];

/** Intrinsic size of /public/ctr-logo.webp — the same mark admin and email use. */
const LOGO_W = 1024;
const LOGO_H = 576;

export function CtrLogo({
  className = "",
  height = 32,
  priority = false,
}: {
  className?: string;
  height?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/ctr-logo.webp"
      alt="CTR Sports"
      width={Math.round((height * LOGO_W) / LOGO_H)}
      height={height}
      priority={priority}
      className={className}
    />
  );
}

/** Next (or live) round of the newest season, for the event tracker bar. */
async function getTrackerData(): Promise<TrackerData | null> {
  const years = await getSeasonYears();
  const year = years[0];
  if (!year) return null;

  const schedule = await getScheduleForSeason(year);
  const gp =
    schedule.find((g) => g.status === "live") ??
    schedule.find((g) => g.status === "scheduled");
  if (!gp) return null;

  // Next upcoming session of that round (falls back to the Race 1 start).
  const detail = await getGpDetail(year, gp.slug);
  const now = Date.now();
  const nextSession = detail?.sessions.find(
    (s) =>
      s.status !== "cancelled" &&
      s.startsAt !== null &&
      Date.parse(s.startsAt) > now,
  );

  return {
    year,
    slug: gp.slug,
    name: gp.name,
    countryCode: gp.circuit.countryCode,
    round: gp.round,
    live: gp.status === "live",
    sessionLabel: nextSession
      ? sessionDisplayLabel({
          type: nextSession.type,
          label: nextSession.label,
          sequence: nextSession.sequence,
        })
      : "Race",
    targetIso: nextSession?.startsAt ?? gp.firstRaceStartsAt,
  };
}

export async function SiteHeader() {
  const [links, fan, banner, tracker] = await Promise.all([
    getSetting<{ label: string; href: string }[]>("nav_links", DEFAULT_LINKS),
    getFanSession(),
    getSetting<{ enabled: boolean; text: string; href: string }>("broadcast_banner", {
      enabled: false,
      text: "",
      href: "",
    }),
    getTrackerData(),
  ]);

  const fanName = fan?.fan.displayName ?? null;

  return (
    <>
      <a
        href="#maincontent"
        className="btn btn-sm btn-brand absolute left-4 top-[-112px] z-[60] focus:top-2"
      >
        Skip to content
      </a>

      {banner.enabled && banner.text ? (
        <Link
          href={banner.href || "#"}
          className="block bg-brand px-4 py-1.5 text-center text-xs font-bold uppercase text-brand-fg"
        >
          {banner.text}
        </Link>
      ) : null}

      {/* Bar 1 — masthead (scrolls away; desktop only) */}
      <div className="hidden bg-surface-3 lg:block">
        <div className="f1-inner flex min-h-[44px] items-center justify-between gap-12">
          <Link
            href="/"
            className="body-xs whitespace-nowrap p-[6px] font-bold text-text-5"
          >
            CTR–JK Tyre FMSCI Indian National Car Racing Championship
          </Link>
          <div className="flex items-center gap-3">
            {SECONDARY_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="body-xs block border-b border-transparent p-[6px] font-semibold uppercase text-text-4 hover:border-text-4"
              >
                {l.label}
              </Link>
            ))}
            <span aria-hidden className="min-h-4 w-px self-center bg-surface-4" />
            {fanName ? (
              <Link href="/account" className="btn btn-sm btn-black">
                {fanName}
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-sm btn-black">
                  Sign in
                </Link>
                <Link href="/register" className="btn btn-sm btn-brand">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bars 2+3 — sticky primary nav + collapsing event tracker */}
      <header className="sticky top-0 z-50">
        <div className="dark-section relative overflow-x-clip border-b border-surface-4 bg-surface-3">
          {/* faint chequered backdrop fading toward the bar's bottom edge */}
          <div
            aria-hidden
            className="chequer pointer-events-none absolute inset-y-0 left-[200px] right-0 text-white opacity-15"
            style={{
              maskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 100%)",
            }}
          />
          <div className="f1-inner relative flex min-h-[54px] items-center justify-between gap-8 md:min-h-[58px] lg:min-h-[64px]">
            <Link href="/" aria-label="CTR Sports home" className="shrink-0">
              <CtrLogo height={36} priority />
            </Link>
            <HeaderNav links={links} secondary={SECONDARY_LINKS} fanName={fanName} />
          </div>
        </div>
        {tracker ? <EventTracker data={tracker} /> : null}
      </header>
    </>
  );
}
