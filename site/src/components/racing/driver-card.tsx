import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { CountryFlag } from "@ctr/ui";
import { mediaUrl } from "@/lib/media";
import { shadeHex } from "./colors";
import type { DriverIndexCard } from "./data";

/**
 * F1 driver card: flat tile on the team's darkened "accessible" colour, with a
 * DRS chevron strip in the bright team colour behind a legibility gradient.
 * Text lives in the left column (first name regular over last name bold, team,
 * car number), the flag sits bottom-left and the headshot fills the right half.
 * The whole card is the link; only the name underlines on hover.
 */
export function DriverCard({
  driver,
  className = "",
}: {
  driver: DriverIndexCard;
  className?: string;
}) {
  const headshot = mediaUrl(driver.headshotPath);
  const fullName = `${driver.firstName} ${driver.lastName}`;
  const initials =
    `${driver.firstName[0] ?? ""}${driver.lastName[0] ?? ""}`.toUpperCase();

  return (
    <Link
      href={`/drivers/${driver.slug}`}
      className={`group relative z-0 grid min-h-[256px] grid-cols-2 grid-rows-[1fr_112px] overflow-clip rounded-md p-4 text-white ${className}`}
      style={
        {
          "--team": driver.teamColor,
          backgroundColor: shadeHex(driver.teamColor, -0.45),
        } as CSSProperties
      }
    >
      {/* DRS chevron strip in the bright team colour — kept faint so it reads
          as texture behind the headshot rather than as banding */}
      <span
        aria-hidden
        className="drs pointer-events-none absolute inset-y-0 -right-8 z-0 w-3/4 opacity-30"
      />
      {/* legibility gradient: solid team-dark on the left, clearing to the right */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-0 w-3/4"
        style={{
          background: `linear-gradient(269.74deg, transparent 20%, ${shadeHex(driver.teamColor, -0.45)} 90%)`,
        }}
      />

      {/* r1c1 — identity block */}
      <div className="relative z-10 min-h-[112px]">
        <p className="display-l font-normal group-hover:underline">{driver.firstName}</p>
        <p className="display-l font-medium group-hover:underline">{driver.lastName}</p>
        <p className="body-xs pb-4 pt-1 font-semibold">{driver.teamName}</p>
        <p className="font-digits text-2xl font-bold leading-none">{driver.carNumber}</p>
      </div>
      <div aria-hidden />

      {/* r2c1 — nationality flag in a white ring */}
      <div className="relative z-10 flex items-end justify-start">
        {driver.countryCode ? (
          <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-white text-[13px] leading-none">
            <CountryFlag code={driver.countryCode} />
          </span>
        ) : null}
      </div>

      {/* r2c2 — headshot bleeding out of the bottom-right cell */}
      <div className="relative">
        {headshot ? (
          <Image
            src={headshot}
            alt={fullName}
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
}
