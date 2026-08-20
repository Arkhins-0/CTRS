import Link from "next/link";
import { CategoryBadge } from "./category-ui";
import type { TeamIndexCard } from "./data";

/** Dark team card — team-coloured top bar, base/principal facts and the
 *  categories the team enters. */
export function TeamCard({ team }: { team: TeamIndexCard }) {
  return (
    <Link href={`/teams/${team.slug}`} className="group block h-full">
      <article
        className="chamfer-tr flex h-full flex-col border border-line bg-surface p-4 transition-all duration-150 group-hover:-translate-y-1 group-hover:border-accent"
        style={{ borderTop: `6px solid ${team.color}` }}
      >
        <h3 className="text-xl font-black uppercase tracking-tight text-white group-hover:text-accent">
          {team.shortName}
        </h3>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
          {team.displayName}
        </p>

        {team.categories.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {team.categories.map((c) => (
              <CategoryBadge key={c.slug} category={c} />
            ))}
          </div>
        ) : null}

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
          <div>
            <dt className="font-bold uppercase tracking-wider text-fg-faint">Base</dt>
            <dd className="mt-0.5 font-semibold text-fg-muted">{team.base ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wider text-fg-faint">Principal</dt>
            <dd className="mt-0.5 font-semibold text-fg-muted">{team.principal ?? "TBA"}</dd>
          </div>
        </dl>

        <p className="mt-auto pt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-fg-faint">
          {team.categories.length}{" "}
          {team.categories.length === 1 ? "category" : "categories"} ·{" "}
          <span className="text-white">{team.driverCount}</span>{" "}
          {team.driverCount === 1 ? "driver" : "drivers"}
        </p>
      </article>
    </Link>
  );
}
