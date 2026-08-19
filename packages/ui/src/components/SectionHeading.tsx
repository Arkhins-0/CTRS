import type { ReactNode } from "react";

/** F1-style section heading: bold uppercase with the red kick on the left. */
export function SectionHeading({
  children,
  right,
  className = "",
}: {
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-end justify-between gap-4 ${className}`}>
      <h2 className="border-l-4 border-f1-red pl-3 text-xl font-black uppercase tracking-tight text-carbon sm:text-2xl dark:text-white">
        {children}
      </h2>
      {right ? <div className="shrink-0 text-sm font-semibold">{right}</div> : null}
    </div>
  );
}
