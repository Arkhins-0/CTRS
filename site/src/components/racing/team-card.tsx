import Link from "next/link";
import type { TeamIndexCard } from "./data";

/** Team card for the /teams grid — chamfered, thick team-coloured top
 *  border, standings position/points, drivers and car facts. */
export function TeamCard({ team }: { team: TeamIndexCard }) {
  return (
    <Link href={`/teams/${team.slug}`} className="group block">
      <article
        className="chamfer-tr flex h-full flex-col border border-warm-grey bg-white p-4 transition-transform duration-150 group-hover:-translate-y-1"
        style={{ borderTop: `6px solid ${team.color}` }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-3xl font-black leading-none text-carbon">{team.position ?? "—"}</p>
          <p className="pr-3 text-right">
            <span className="text-2xl font-black leading-none text-carbon">{team.points}</span>
            <span className="ml-1 text-[11px] font-bold uppercase tracking-wider text-f1-grey">
              pts
            </span>
          </p>
        </div>

        <h3 className="mt-3 text-xl font-black uppercase tracking-tight text-carbon group-hover:text-f1-red">
          {team.displayName}
        </h3>

        {team.drivers.length ? (
          <ul className="mt-3 space-y-1">
            {team.drivers.map((d) => (
              <li key={d.slug} className="flex items-center gap-2 text-sm font-semibold text-carbon">
                <span
                  aria-hidden
                  className="inline-block h-4 w-1 rounded-sm"
                  style={{ backgroundColor: team.color }}
                />
                {d.name}
              </li>
            ))}
          </ul>
        ) : null}

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-warm-grey pt-3 text-xs">
          <div>
            <dt className="font-bold uppercase tracking-wider text-f1-grey">Car</dt>
            <dd className="mt-0.5 font-semibold text-carbon">{team.carModel ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wider text-f1-grey">Power Unit</dt>
            <dd className="mt-0.5 font-semibold text-carbon">{team.powerUnit ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wider text-f1-grey">Base</dt>
            <dd className="mt-0.5 font-semibold text-carbon">{team.base ?? "—"}</dd>
          </div>
        </dl>
      </article>
    </Link>
  );
}
