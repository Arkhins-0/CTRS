import Link from "next/link";

/**
 * Row of season-year links (server component — `hrefFor` never crosses a
 * client boundary). The selected year is filled F1 red.
 */
export function SeasonSelector({
  years,
  selected,
  hrefFor,
}: {
  years: number[];
  selected: number;
  hrefFor: (year: number) => string;
}) {
  if (!years.length) return null;
  return (
    <nav aria-label="Season" className="flex flex-wrap items-center gap-1.5">
      {years.map((year) => (
        <Link
          key={year}
          href={hrefFor(year)}
          aria-current={year === selected ? "page" : undefined}
          style={{ ["--chamfer" as string]: "8px" }}
          className={`chamfer-tr px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
            year === selected
              ? "bg-f1-red text-white"
              : "border border-warm-grey bg-white text-f1-grey hover:border-f1-red hover:text-carbon"
          }`}
        >
          {year}
        </Link>
      ))}
    </nav>
  );
}
