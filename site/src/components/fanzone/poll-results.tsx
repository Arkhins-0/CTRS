/** Horizontal result bars for a poll — fan's own pick highlighted in red. */
export function PollResults({
  options,
  counts,
  highlightOptionId = null,
  markWinner = false,
}: {
  options: { id: string; label: string }[];
  counts: Record<string, number>;
  /** the fan's own choice — rendered as a red bar */
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
              <span className={`font-semibold ${mine ? "text-f1-red" : "text-carbon"}`}>
                {o.label}
                {mine ? (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-f1-red">
                    Your pick
                  </span>
                ) : null}
                {winner ? (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Winner
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs font-bold text-f1-grey">
                {pct}% · {votes} {votes === 1 ? "vote" : "votes"}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden bg-warm-grey">
              <div
                className={`h-full transition-all ${mine ? "bg-f1-red" : "bg-carbon"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs font-semibold uppercase tracking-wide text-f1-grey">
        {total} total {total === 1 ? "vote" : "votes"}
      </p>
    </div>
  );
}
