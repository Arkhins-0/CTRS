import Link from "next/link";
import { SESSION_LABELS, SESSION_ORDER, type SessionType } from "./meta";

/** Tab bar linking to every session of a GP that already has results. */
export function SessionTabs({
  year,
  gpSlug,
  sessions,
  active,
}: {
  year: number;
  gpSlug: string;
  sessions: { type: SessionType; hasResults: boolean }[];
  active?: SessionType;
}) {
  const tabs = sessions
    .filter((s) => s.hasResults)
    .sort((a, b) => SESSION_ORDER[a.type] - SESSION_ORDER[b.type]);
  if (!tabs.length) return null;

  return (
    <nav aria-label="Sessions" className="flex flex-wrap gap-1.5">
      {tabs.map((s) => (
        <Link
          key={s.type}
          href={`/results/${year}/${gpSlug}/${s.type}`}
          aria-current={s.type === active ? "page" : undefined}
          style={{ ["--chamfer" as string]: "8px" }}
          className={`chamfer-tr px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
            s.type === active
              ? "bg-f1-red text-white"
              : "border border-warm-grey bg-white text-f1-grey hover:border-f1-red hover:text-carbon"
          }`}
        >
          {SESSION_LABELS[s.type]}
        </Link>
      ))}
    </nav>
  );
}
