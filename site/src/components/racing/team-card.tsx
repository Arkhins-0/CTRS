import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/media";
import { CategoryBadge } from "./category-ui";
import { readableOn, shadeHex } from "./colors";
import type { TeamIndexCard } from "./data";

/** 2–3 letter roundel stand-in for the team logo (we hold no logo artwork). */
function teamInitials(name: string): string {
  const words = name.split(/[\s-]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * F1 team card: the bright team colour as the card surface, a 315° dark scrim
 * anchored top-left for text legibility, a DRS chevron strip pinned bottom-right
 * and the line-up as avatar chips. Whole card links; only the name underlines.
 */
export function TeamCard({
  team,
  className = "",
}: {
  team: TeamIndexCard;
  className?: string;
}) {
  const dark = shadeHex(team.color, -0.45);
  const fg = readableOn(team.color);

  return (
    <Link
      href={`/teams/${team.slug}`}
      className={`group relative z-0 flex min-h-[256px] flex-col overflow-hidden rounded-md p-4 text-white lg:p-6 ${className}`}
      style={{ "--team": team.color, backgroundColor: team.color } as CSSProperties}
    >
      {/* dark scrim — solid top-left, clearing toward the bottom-right */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: `linear-gradient(315deg, transparent 0%, ${dark} 100%)` }}
      />
      {/* DRS chevron strip, bottom-right */}
      <span
        aria-hidden
        className="drs drs-flip pointer-events-none absolute -bottom-0.5 right-0 z-10 h-32 w-2/3 lg:h-[150px]"
      />

      <div className="relative z-20 flex h-full flex-col gap-[22px] lg:gap-9">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-3">
            <p className="display-l lg:display-xl font-medium group-hover:underline">
              {team.displayName}
            </p>
            {team.drivers.length ? (
              <div className="flex flex-col gap-y-2 lg:flex-row lg:flex-wrap lg:gap-x-4">
                {team.drivers.slice(0, 4).map((d) => {
                  const shot = mediaUrl(d.headshotPath);
                  return (
                    <span key={d.slug} className="flex items-center gap-2 rounded-sm">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full"
                        style={{ backgroundColor: team.color }}
                      >
                        {shot ? (
                          <Image
                            src={shot}
                            alt=""
                            width={20}
                            height={20}
                            className="h-5 w-5 object-cover object-top"
                          />
                        ) : (
                          <span
                            className="text-[9px] font-bold leading-none"
                            style={{ color: fg }}
                          >
                            {d.carNumber}
                          </span>
                        )}
                      </span>
                      <span className="body-xs whitespace-nowrap">
                        <span className="font-normal">{d.firstName} </span>
                        <span className="font-bold uppercase">{d.lastName}</span>
                      </span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="body-xs font-semibold">
                {team.driverCount} {team.driverCount === 1 ? "driver" : "drivers"}
              </p>
            )}
          </div>

          {/* logo roundel */}
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: dark }}
          >
            <span className="font-display text-sm font-medium leading-none text-white">
              {teamInitials(team.shortName || team.displayName)}
            </span>
          </span>
        </div>

        {/* base / principal / categories fill the card's lower half */}
        <div className="mt-auto flex flex-col gap-3">
          {team.categories.length ? (
            <div className="flex flex-wrap gap-1.5">
              {team.categories.map((c) => (
                <span
                  key={c.slug}
                  className="rounded-xs border border-white/50 px-1.5 py-0.5 text-[11px] font-bold uppercase leading-4 text-white"
                >
                  {c.shortName}
                </span>
              ))}
            </div>
          ) : null}
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            {team.base ? (
              <div>
                <dt className="body-2xs font-semibold uppercase text-white/70">Base</dt>
                <dd className="body-xs font-bold">{team.base}</dd>
              </div>
            ) : null}
            {team.principal ? (
              <div>
                <dt className="body-2xs font-semibold uppercase text-white/70">
                  Team Principal
                </dt>
                <dd className="body-xs font-bold">{team.principal}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </Link>
  );
}
