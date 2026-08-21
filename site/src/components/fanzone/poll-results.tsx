import { Chip } from "./chip";

/** Horizontal result bars for a poll — fan's own pick highlighted in brand. */
export function PollResults({
  options,
  counts,
  highlightOptionId = null,
  markWinner = false,
}: {
  options: { id: string; label: string }[];
  counts: Record<string, number>;
  /** the fan's own choice — rendered as a brand bar */
  highlightOptionId?: string | null;
  /** mark the most-voted option(s) — for closed polls */
  markWinner?: boolean;
}) {
  const total = options.reduce((sum, o) => sum + (counts[o.id] ?? 0), 0);
  const max = options.reduce((m, o) => Math.max(m, counts[o.id] ?? 0), 0);

  return (
    <div className="space-y-3">
      {options.map((o) => {
        const votes = counts[o.id] ?? 0;
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
        const mine = o.id === highlightOptionId;
        const winner = markWinner && total > 0 && votes === max;
        return (
          <div key={o.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className={`body-s font-semibold ${mine ? "text-brand" : "text-text-5"}`}>
                {o.label}
                {mine ? (
                  <span className="ml-2 text-[11px] font-bold uppercase leading-4 text-brand">
                    Your pick
                  </span>
                ) : null}
                {winner ? (
                  <Chip tone="accent" className="ml-2">
                    Winner
                  </Chip>
                ) : null}
              </span>
              <span className="body-2xs shrink-0 text-text-3">
                <span className="font-digits font-bold text-text-5">{pct}%</span>
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
                <span className="font-digits font-bold text-text-5">{votes}</span>{" "}
                {votes === 1 ? "vote" : "votes"}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className={`h-full rounded-full transition-all ${mine ? "bg-brand" : "bg-surface-5"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="body-2xs font-semibold uppercase text-text-3">
        <span className="font-digits font-bold text-text-5">{total}</span> total{" "}
        {total === 1 ? "vote" : "votes"}
      </p>
    </div>
  );
}
