import Image from "next/image";
import Link from "next/link";
import { CountryFlag } from "@ctr/ui";
import { mediaUrl } from "@/lib/media";
import { teamGradient } from "./colors";
import type { DriverIndexCard } from "./data";

/**
 * F1.com-style driver card: tall tile on a team-coloured diagonal gradient —
 * first name over LAST NAME top-left, big italic car number bottom-left,
 * headshot (or bold initials watermark) bottom-right.
 */
export function DriverCard({ driver }: { driver: DriverIndexCard }) {
  const headshot = mediaUrl(driver.headshotPath);
  const fullName = `${driver.firstName} ${driver.lastName}`;
  const initials = `${driver.firstName[0] ?? ""}${driver.lastName[0] ?? ""}`.toUpperCase();

  return (
    <Link href={`/drivers/${driver.slug}`} className="group block h-full">
      <article
        className="chamfer-tr relative flex aspect-[3/4] flex-col overflow-hidden border border-line p-4 transition-all duration-150 group-hover:-translate-y-1 group-hover:border-accent"
        style={teamGradient(driver.teamColor)}
      >
        {/* Name block */}
        <div className="relative z-10">
          <p className="text-sm font-semibold text-white/80">{driver.firstName}</p>
          <p className="text-xl font-black uppercase leading-tight tracking-tight text-white sm:text-2xl">
            {driver.lastName}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/65">
            {driver.teamName}
            <CountryFlag code={driver.countryCode} className="text-xs" />
          </p>
        </div>

        {/* Headshot / initials watermark */}
        {headshot ? (
          <div className="absolute right-0 bottom-0 h-3/5 w-3/4">
            <Image
              src={headshot}
              alt={fullName}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-contain object-bottom-right"
            />
          </div>
        ) : (
          <span
            aria-hidden
            className="pointer-events-none absolute -right-2 bottom-0 select-none text-[7rem] font-black leading-none tracking-tighter text-white/10"
          >
            {initials}
          </span>
        )}

        {/* Car number */}
        <p className="relative z-10 mt-auto text-5xl font-black italic leading-none text-white/90">
          {driver.carNumber}
        </p>
      </article>
    </Link>
  );
}
