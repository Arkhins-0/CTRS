import { Chip } from "./chip";

/** Horizontal result bars for a poll — fan's own pick highlighted in accent. */
export function PollResults({
  options,
  counts,
  highlightOptionId = null,
  markWinner = false,
}: {
  options: { id: string; label: string }[];
  counts: Record<string, number>;
  /** the fan's own choice — rendered as an accent bar */
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
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className={`font-semibold ${mine ? "text-accent" : "text-white"}`}>
                {o.label}
                {mine ? (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-accent">
                    Your pick
                  </span>
                ) : null}
                {winner ? (
                  <Chip tone="accent" className="ml-2">
                    Winner
                  </Chip>
                ) : null}
              </span>
              <span className="shrink-0 text-xs font-bold text-fg-faint">
                {pct}% · {votes} {votes === 1 ? "vote" : "votes"}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden bg-page">
              <div
                className={`h-full transition-all ${mine ? "bg-accent" : "bg-panel"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
        {total} total {total === 1 ? "vote" : "votes"}
      </p>
    </div>
  );
}
