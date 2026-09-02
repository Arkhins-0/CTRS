import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { asc, eq } from "drizzle-orm";
import { db, newsletterSubscribers, sponsors, TAGS } from "@ctr/db";
import { cached } from "@/lib/cache";
import { CookieSettingsLink } from "@/components/consent/cookie-settings-link";
import { getFanSession } from "@/lib/fan-auth";
import { mediaUrl } from "@/lib/media";
import { getSetting } from "@/lib/settings";
import { CtrLogo } from "./site-header";

type FooterGroup = { group: string; links: { label: string; href: string }[] };
type SocialLink = { platform: string; url: string };

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  x: Twitter,
  twitter: Twitter,
  youtube: Youtube,
};

/** Decorative footer separator: a slim chequered finish line banded by
 *  brand-colour hairlines. Deliberately fine-grained (see .chequer-fine) —
 *  at the default 14px squares a strip this short showed one broken row and
 *  read as a fat stripe instead of a flag. */
function FinishLine({ className = "" }: { className?: string }) {
  return (
    <span className={`block w-full ${className}`}>
      <span aria-hidden className="block h-px w-full bg-brand" />
      <span
        aria-hidden
        className="chequer chequer-fine block h-1.5 w-full bg-black text-white"
      />
      <span aria-hidden className="block h-px w-full bg-brand" />
    </span>
  );
}

function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function SiteFooter() {
  const [groups, socials, partnerRows] = await Promise.all([
    getSetting<FooterGroup[]>("footer_links", []),
    getSetting<SocialLink[]>("social_links", []),
    cached(
      () =>
        db.query.sponsors.findMany({
          where: eq(sponsors.isActive, true),
          orderBy: [asc(sponsors.sort)],
          with: { logo: true },
        }),
      ["footer-sponsors"],
      [TAGS.sponsors],
      3600,
    ),
  ]);

  /*
   * The promo card used to pitch "Register free" and "Newsletter" to
   * everyone, including people already signed in and already subscribed.
   * Both reads are deliberately UNCACHED and per-request: getFanSession is
   * React-cached for this request only, and the subscription lookup runs
   * just for signed-in fans — putting either behind unstable_cache would
   * share one visitor's state with every other visitor.
   */
  const session = await getFanSession();
  const fan = session?.fan ?? null;
  const [subscription] = fan
    ? await db
        .select({ status: newsletterSubscribers.status })
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, fan.email))
    : [];
  const subscribed = subscription?.status === "confirmed" || subscription?.status === "pending";

  return (
    <footer>
      {/* Sponsor tier — always dark */}
      {partnerRows.length ? (
        <div className="dark-section bg-static-9 text-white">
          <div className="f1-inner flex flex-col gap-12 py-8 lg:gap-16 lg:py-12">
            <p className="display-xl mt-3 font-black uppercase lg:mt-4">
              Championship Partners
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-10 pb-2 lg:gap-x-16">
              {partnerRows.map((p) => {
                const url = mediaUrl(p.logo?.path);
                return (
                  <li key={p.id}>
                    {/*
                     * No plate: the logos are rendered as white silhouettes
                     * instead. Partner artwork is drawn for light grounds
                     * (JK Tyre and FMSCI are near-black) and would vanish on
                     * this band, so `brightness-0 invert` flattens each mark
                     * to white — which needs a transparent source, the
                     * reason the placeholder marks were redrawn without
                     * their opaque backgrounds. Slightly dimmed at rest and
                     * full strength on hover, the usual partner-row move.
                     */}
                    <span className="block w-28 md:w-32 lg:w-36">
                      {url ? (
                        <Image
                          src={url}
                          alt={p.name}
                          width={144}
                          height={81}
                          className="aspect-video w-full object-contain opacity-75 brightness-0 invert transition-opacity duration-200 hover:opacity-100"
                        />
                      ) : (
                        <span className="body-xs flex aspect-video w-full items-center justify-center text-center font-bold uppercase text-white/70">
                          {p.name}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Main band — black chrome, like the header (the pages are white,
          the chrome is not: the gold logo, white chequer texture and white
          tint card in here are all drawn for a dark ground). */}
      <div className="dark-section bg-surface-2">
        <div className="f1-inner flex flex-col py-12">
          <div className="flex flex-wrap items-stretch justify-between gap-6 lg:flex-nowrap">
            {/* Fan Zone promo card (F1 app-card slot) */}
            <div className="relative w-full overflow-clip rounded-md bg-white/5 p-6 lg:min-h-[380px] lg:w-[370px] lg:shrink-0 lg:grow-0 lg:basis-[370px]">
              {/* The card used to carry a chequer patch in one corner, which
                  read as a stray scrap of flag rather than a texture. The
                  halftone screen the driver and team cards use covers the
                  whole card instead, and ties the footer to them. */}
              <span
                aria-hidden
                className="halftone pointer-events-none absolute inset-0 text-white/15"
              />
              <div className="relative flex h-full flex-col gap-4">
                <CtrLogo height={40} />
                <p className="display-xl font-black uppercase text-text-5">
                  {fan ? "Your CTR Fan Zone" : "Join the CTR Fan Zone"}
                </p>
                <p className="display-s uppercase text-text-3">
                  Predictions · Polls · Favourites{subscribed ? "" : " · Newsletter"}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                  {fan ? (
                    <Link href="/account" className="btn btn-sm btn-brand">
                      My account
                    </Link>
                  ) : (
                    <Link href="/register" className="btn btn-sm btn-brand">
                      Register free
                    </Link>
                  )}
                  {/* Nothing to pitch to someone already subscribed. */}
                  {subscribed ? null : (
                    <Link href="/newsletter" className="btn btn-sm btn-stroke">
                      Newsletter
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Link columns with hairline dividers */}
            {groups.map((g, i) => (
              <div key={g.group} className="contents">
                <span
                  aria-hidden
                  className="hidden w-px self-stretch bg-surface-6 md:block"
                />
                <div className="min-w-[150px] md:flex-1">
                  <p className="display-s font-medium uppercase text-text-5">{g.group}</p>
                  <ul className={`mt-6 flex flex-col ${i === 0 ? "gap-6" : "gap-4"}`}>
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className={`display-s flex items-center gap-2 hover:underline hover:decoration-2 hover:underline-offset-2 ${
                            i === 0 ? "text-text-4" : "text-text-3"
                          }`}
                        >
                          {l.label}
                          {i === 0 ? <Chevron /> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Finish-line separator */}
          <div role="separator" className="flex items-center gap-6 pb-8 pt-12 lg:pt-16">
            <FinishLine className="rounded-xs overflow-hidden" />
            <CtrLogo height={24} className="shrink-0" />
          </div>

          {/* Bottom controls */}
          <div className="grid items-center gap-4 min-[640px]:grid-cols-2">
            <p className="body-2xs font-semibold text-text-3">
              CTR Unified — One Nation. One Championship.
              <br />
              29, Tilak Street, T. Nagar, Chennai, Tamil Nadu 600017 · 9500016999 ·{" "}
              admin@ctrsports.in
            </p>
            {socials.length ? (
              <ul className="flex items-center gap-2 min-[640px]:justify-end">
                {socials.map((s) => {
                  const Icon = SOCIAL_ICONS[s.platform.toLowerCase()];
                  return (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.platform}
                        className="hover-tint flex h-9 w-9 items-center justify-center rounded-full text-text-4"
                      >
                        {Icon ? (
                          <Icon size={20} aria-hidden />
                        ) : (
                          <span className="text-[10px] font-bold uppercase">
                            {s.platform.slice(0, 2)}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          <div className="body-2xs mt-4 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 font-semibold text-text-3">
            <CookieSettingsLink className="underline hover:text-text-5" />
            <span aria-hidden>·</span>
            <p>
              © {new Date().getFullYear()} CTR–JK Tyre FMSCI Indian National Car Racing
              Championship · CTR Unified
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
