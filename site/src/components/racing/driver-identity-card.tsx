import Image from "next/image";
import Link from "next/link";
import { CountryFlag } from "@ctr/ui";
import { mediaUrl } from "@/lib/media";
import { CategoryBadge } from "./category-ui";
import { readableOn, shadeHex } from "./colors";
import { HalftoneWash } from "./profile-ui";

/* ── The driver card ───────────────────────────────────────────────────────
   One component behind every driver card on the site — the drivers index,
   the standings podium, a team's line-up and the homepage season band all
   render this, so they cannot drift apart the way four separate
   implementations had (a DRS chevron here, a darkening gradient there).

   It is the driver page's hero, scaled down: the flat team colour under a
   halftone dot screen, the car number huge in a darkened tint behind the
   headshot, and the name in the site's signature pairing — handwritten
   script first name over the surname in black caps. Ink flips to black on
   light team colours so a yellow car reads as well as a navy one. ───────── */

const SIZES = {
  sm: {
    card: "min-h-[210px] md:min-h-[230px]",
    first: "text-3xl lg:text-4xl",
    last: "display-l lg:display-xl",
    number: "text-[5.5rem] lg:text-[7rem]",
    shot: "w-[130px] md:w-[150px]",
  },
  md: {
    card: "min-h-[240px] md:min-h-[268px]",
    first: "text-4xl lg:text-5xl",
    last: "display-xl lg:display-2xl",
    number: "text-[7rem] lg:text-[9rem]",
    shot: "w-[160px] md:w-[185px]",
  },
  lg: {
    card: "min-h-[272px] md:min-h-[312px]",
    first: "text-5xl lg:text-6xl",
    last: "display-2xl lg:display-3xl",
    number: "text-[8.5rem] lg:text-[11rem]",
    shot: "w-[190px] md:w-[225px]",
  },
} as const;

export type DriverCardDriver = {
  slug: string;
  firstName: string;
  lastName: string;
  code: string;
  countryCode: string | null;
  headshotPath: string | null;
};

const ORDINALS = ["th", "st", "nd", "rd"] as const;

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  return ORDINALS[v % 10] ?? "th";
}

export function DriverIdentityCard({
  driver,
  teamColor,
  teamName,
  carNumber,
  category,
  position,
  points,
  size = "md",
  className = "",
}: {
  driver: DriverCardDriver;
  teamColor?: string | null;
  teamName?: string | null;
  carNumber?: number | null;
  /** Class badge in the eyebrow row (the drivers index groups by class). */
  category?: { shortName: string; color: string } | null;
  /** Championship position — turns the card into a podium card. */
  position?: number | null;
  points?: number | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const color = teamColor ?? "#67676d";
  const fg = readableOn(color);
  const ink = shadeHex(color, fg === "#ffffff" ? -0.4 : -0.28);
  const headshot = mediaUrl(driver.headshotPath);
  const s = SIZES[size];
  const initials = `${driver.firstName[0] ?? ""}${driver.lastName[0] ?? ""}`.toUpperCase();

  return (
    <Link
      href={`/drivers/${driver.slug}`}
      className={`group relative z-0 flex overflow-hidden rounded-lg ${s.card} ${className}`}
      style={{ backgroundColor: color, color: fg }}
    >
      <HalftoneWash fg={fg} />

      {/* car number, big and tinted — sits behind the portrait */}
      {carNumber != null ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute -top-2 right-3 select-none font-display font-black leading-none ${s.number}`}
          style={{ color: ink }}
        >
          {carNumber}
        </span>
      ) : null}

      {/* portrait, anchored to the bottom-right corner */}
      {headshot ? (
        <span
          className={`pointer-events-none absolute bottom-0 right-0 aspect-square ${s.shot}`}
        >
          <Image
            src={headshot}
            alt=""
            fill
            sizes="225px"
            className="card-img object-contain object-bottom"
          />
        </span>
      ) : (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-4 right-5 select-none font-display text-6xl font-black leading-none opacity-25"
        >
          {initials}
        </span>
      )}

      <div className="relative z-10 flex flex-1 flex-col gap-1 p-4 lg:p-5">
        {/* eyebrow — class badge, flag, code (or the finishing position) */}
        <div className="flex flex-wrap items-center gap-2">
          {position != null ? (
            <span className="flex items-start gap-0.5 pr-1">
              <span className="technical-xl font-bold">{position}</span>
              <span className="technical-2xs mt-1 font-bold">{ordinalSuffix(position)}</span>
            </span>
          ) : null}
          {category ? (
            <CategoryBadge
              category={category}
              /* the badge borrows the card's own ink so it reads on any
                 team colour, rather than its class colour on a clashing one */
              className="border-current text-current opacity-80"
            />
          ) : null}
          <CountryFlag code={driver.countryCode} className="text-base leading-none" />
          <span className="body-2xs font-bold uppercase opacity-70">{driver.code}</span>
        </div>

        {/* the signature pairing: script first name over black caps surname */}
        <p className={`font-script mt-1 max-w-[62%] leading-none ${s.first}`}>
          {driver.firstName}
        </p>
        <p className={`max-w-[62%] font-black uppercase leading-none ${s.last} group-hover:underline`}>
          {driver.lastName}
        </p>

        <span className="flex-1" aria-hidden />

        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          {teamName ? (
            <span className="body-xs max-w-[62%] truncate font-semibold opacity-80">
              {teamName}
            </span>
          ) : null}
          {points != null ? (
            <span className="flex items-baseline gap-1">
              <span className="technical-l font-bold">{points}</span>
              <span className="technical-2xs font-bold opacity-70">PTS</span>
            </span>
          ) : carNumber != null && !teamName ? null : null}
        </div>
      </div>
    </Link>
  );
}
