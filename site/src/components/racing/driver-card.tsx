import Image from "next/image";
import Link from "next/link";
import { CountryFlag } from "@ctr/ui";
import { mediaUrl, placeholderStyle } from "@/lib/media";
import type { DriverIndexCard } from "./data";

/** Driver card for the /drivers grid — team-coloured top border, big car
 *  number, headshot (or gradient placeholder with the driver code). */
export function DriverCard({ driver }: { driver: DriverIndexCard }) {
  const headshot = mediaUrl(driver.headshotPath);
  const fullName = `${driver.firstName} ${driver.lastName}`;

  return (
    <Link href={`/drivers/${driver.slug}`} className="group block">
      <article
        className="chamfer-tr flex h-full flex-col border border-warm-grey border-t-4 bg-white transition-transform duration-150 group-hover:-translate-y-1"
        style={{ borderTopColor: driver.teamColor }}
      >
        <div className="flex items-start justify-between px-4 pt-3">
          <div>
            <p className="text-2xl font-black leading-none text-carbon">
              {driver.position ?? "—"}
            </p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-f1-grey">
              {driver.points} pts
            </p>
          </div>
          <p className="pr-3 text-4xl font-black italic leading-none text-warm-grey">
            {driver.carNumber}
          </p>
        </div>

        <div className="relative mt-3 aspect-square overflow-hidden">
          {headshot ? (
            <Image
              src={headshot}
              alt={fullName}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
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

        <div className="border-t border-warm-grey px-4 py-3">
          <p className="text-sm font-medium text-f1-grey">{driver.firstName}</p>
          <p className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-carbon">
            {driver.lastName}
            <CountryFlag code={driver.countryCode} className="text-base" />
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-f1-grey">
            {driver.teamName}
          </p>
        </div>
      </article>
    </Link>
  );
}
