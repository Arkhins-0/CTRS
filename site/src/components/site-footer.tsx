import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { asc, eq } from "drizzle-orm";
import { db, sponsors, TAGS } from "@ctr/db";
import { cached } from "@/lib/cache";
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

/** Decorative racing-line separator (brand colour), stretched full width. */
function RacingLine({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 16"
      preserveAspectRatio="none"
      className={`h-4 w-full ${className}`}
    >
      <path
        d="M0 13 C 120 13, 170 3, 300 3 S 480 13, 620 13 S 830 2, 950 3 S 1130 12, 1200 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
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

  return (
    <footer>
      {/* Sponsor tier — always dark */}
      {partnerRows.length ? (
        <div className="dark-section bg-static-9 text-white">
          <div className="f1-inner flex flex-col gap-12 py-8 lg:gap-16 lg:py-12">
            <p className="display-xl mt-3 font-black uppercase lg:mt-4">
              Championship Partners
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-11 pb-2">
              {partnerRows.map((p) => {
                const url = mediaUrl(p.logo?.path);
                return (
                  <li key={p.id}>
                    <span className="block w-[72px] rounded-md p-2 transition-colors hover:bg-static-7 md:w-[88px] lg:w-[96px]">
                      {url ? (
                        <Image
                          src={url}
                          alt={p.name}
                          width={96}
                          height={54}
                          className="aspect-video w-full object-contain"
                        />
                      ) : (
                        <span className="body-xs flex aspect-video w-full items-center justify-center text-center font-bold uppercase text-static-4">
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

      {/* Main band — themed warm surface */}
      <div className="bg-surface-3">
        <div className="f1-inner flex flex-col py-12">
          <div className="flex flex-wrap items-stretch justify-between gap-6 lg:flex-nowrap">
            {/* Fan Zone promo card (F1 app-card slot) */}
            <div className="relative w-full overflow-clip rounded-md bg-black/[0.04] p-6 lg:min-h-[380px] lg:w-[370px] lg:shrink-0 lg:grow-0 lg:basis-[370px]">
              <div
                aria-hidden
                className="chequer pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 text-black opacity-[0.04]"
              />
              <div className="relative flex h-full flex-col gap-4">
                <CtrLogo className="text-text-5" />
                <p className="display-xl font-black uppercase text-text-5">
                  Join the CTR Fan Zone
                </p>
                <p className="display-s uppercase text-text-3">
                  Predictions · Polls · Favourites · Newsletter
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                  <Link href="/register" className="btn btn-sm btn-brand">
                    Register free
                  </Link>
                  <Link href="/newsletter" className="btn btn-sm btn-stroke">
                    Newsletter
                  </Link>
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

          {/* Racing-line separator */}
          <div role="separator" className="flex items-center gap-6 pb-8 pt-12 lg:pt-16">
            <RacingLine className="text-brand" />
            <CtrLogo className="shrink-0 text-text-5" />
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
          <p className="body-2xs mt-4 text-right font-semibold text-text-3">
            © {new Date().getFullYear()} CTR Sports · CTR Unified
          </p>
        </div>
      </div>
    </footer>
  );
}
