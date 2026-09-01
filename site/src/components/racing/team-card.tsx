import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/media";
import { readableOn, shadeHex } from "./colors";
import type { TeamIndexCard } from "./data";
import { HalftoneWash } from "./profile-ui";

/**
 * Splits a team name the way the driver card splits a person's: the first
 * word carries the handwritten script, the rest goes to black caps.
 * Single-word names keep the whole thing in caps rather than rendering one
 * lonely script word with nothing to anchor it.
 */
function splitTeamName(name: string): { script: string | null; caps: string } {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return { script: null, caps: name };
  return { script: words[0] as string, caps: words.slice(1).join(" ") };
}

/** 2–3 letter roundel stand-in, used only until a team uploads a logo. */
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
 * Team card — the same language as the driver card: the flat team colour
 * under a halftone dot screen, the team mark in a darkened roundel top-right
 * and the car render bleeding off the bottom-right corner.
 *
 * The car artwork is expected to be a cutout on a transparent background;
 * it is composited straight onto the team colour with no plate behind it,
 * so anything with a baked-in white background will show as a box.
 */
export function TeamCard({
  team,
  className = "",
}: {
  team: TeamIndexCard;
  className?: string;
}) {
  const dark = shadeHex(team.color, -0.35);
  const fg = readableOn(team.color);
  const logo = mediaUrl(team.logoPath);
  const car = mediaUrl(team.carImagePath);
  const { script, caps } = splitTeamName(team.displayName);

  return (
    <Link
      href={`/teams/${team.slug}`}
      className={`group relative z-0 flex min-h-[256px] flex-col overflow-hidden rounded-lg p-4 lg:p-6 ${className}`}
      style={{ backgroundColor: team.color, color: fg }}
    >
      <HalftoneWash fg={fg} />

      {/* car render — cutout PNG/WebP with a transparent background, sitting
          directly on the team colour and running off the bottom edge */}
      {car ? (
        <span className="pointer-events-none absolute -bottom-1 right-0 z-10 h-28 w-[70%] lg:h-36">
          <Image
            src={car}
            alt=""
            fill
            sizes="(max-width: 735px) 70vw, 420px"
            className="card-img object-contain object-bottom-right"
          />
        </span>
      ) : null}

      <div className="relative z-20 flex h-full flex-col gap-[22px] lg:gap-9">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-3">
            <p className="group-hover:underline">
              {script ? (
                <span className="font-script block text-3xl leading-none lg:text-4xl">
                  {script}
                </span>
              ) : null}
              <span className="display-l lg:display-xl block font-black uppercase leading-tight">
                {caps}
              </span>
            </p>
            {team.drivers.length ? (
              <div className="flex flex-col gap-y-2 lg:flex-row lg:flex-wrap lg:gap-x-4">
                {team.drivers.slice(0, 4).map((d) => {
                  const shot = mediaUrl(d.headshotPath);
                  return (
                    <span key={d.slug} className="flex items-center gap-2 rounded-sm">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full"
                        style={{ backgroundColor: dark }}
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
                            style={{ color: readableOn(dark) }}
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

          {/* logo roundel — the real team mark, initials only as a fallback */}
          <span
            className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full lg:h-16 lg:w-16"
            style={{ backgroundColor: dark }}
          >
            {logo ? (
              <Image
                src={logo}
                alt=""
                fill
                sizes="64px"
                className="object-contain p-2"
              />
            ) : (
              <span
                className="font-display text-sm font-bold leading-none"
                style={{ color: readableOn(dark) }}
              >
                {teamInitials(team.shortName || team.displayName)}
              </span>
            )}
          </span>
        </div>

        {/* base / principal / categories fill the card's lower half */}
        <div className="mt-auto flex max-w-[60%] flex-col gap-3">
          {team.categories.length ? (
            <div className="flex flex-wrap gap-1.5">
              {team.categories.map((c) => (
                <span
                  key={c.slug}
                  className="rounded-xs border border-current px-1.5 py-0.5 text-[11px] font-bold uppercase leading-4 opacity-80"
                >
                  {c.shortName}
                </span>
              ))}
            </div>
          ) : null}
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            {team.base ? (
              <div>
                <dt className="body-2xs font-semibold uppercase opacity-70">Base</dt>
                <dd className="body-xs font-bold">{team.base}</dd>
              </div>
            ) : null}
            {team.principal ? (
              <div>
                <dt className="body-2xs font-semibold uppercase opacity-70">Team Principal</dt>
                <dd className="body-xs font-bold">{team.principal}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </Link>
  );
}
