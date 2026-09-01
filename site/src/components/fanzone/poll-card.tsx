import Link from "next/link";
import { format } from "date-fns";
import { votePoll } from "@/app/(main)/polls/actions";
import { Chip } from "./chip";
import { PollResults } from "./poll-results";
import { SubmitButton } from "./submit-button";

export type PollCardPoll = {
  id: string;
  question: string;
  kind: "poll" | "prediction";
  status: "draft" | "open" | "closed";
  closesAt: Date | null;
  round: { name: string } | null;
  options: { id: string; label: string; sort: number }[];
};

/** One poll as a white card: kind badge, question, then vote form / results. */
export function PollCard({
  poll,
  counts,
  signedIn,
  myOptionId,
}: {
  poll: PollCardPoll;
  counts: Record<string, number>;
  signedIn: boolean;
  myOptionId: string | null;
}) {
  const closed = poll.status === "closed";
  const voted = myOptionId !== null;

  return (
    <article className="flex h-full flex-col rounded-md bg-surface-1 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="accent-outline">{poll.kind === "prediction" ? "Prediction" : "Poll"}</Chip>
        {poll.round ? <Chip tone="outline">{poll.round.name}</Chip> : null}
        {closed ? <Chip tone="faint">Closed</Chip> : null}
      </div>

      <h2 className="display-l mt-3 font-medium uppercase text-text-5">{poll.question}</h2>
      {!closed && poll.closesAt ? (
        <p className="body-2xs mt-1.5 font-semibold text-text-3">
          Closes {format(poll.closesAt, "d MMM yyyy")}
        </p>
      ) : null}

      <div className="mt-5 flex-1">
        {closed ? (
          <PollResults
            options={poll.options}
            counts={counts}
            highlightOptionId={myOptionId}
            markWinner
          />
        ) : !signedIn ? (
          <>
            <ul className="space-y-2" aria-disabled>
              {poll.options.map((o) => (
                <li
                  key={o.id}
                  className="body-s rounded-md border border-surface-4 bg-surface-3 px-4 py-2.5 font-semibold text-text-3"
                >
                  {o.label}
                </li>
              ))}
            </ul>
            <Link href="/login" className="btn btn-sm btn-black mt-4">
              Sign in to vote
            </Link>
          </>
        ) : voted ? (
          <>
            <PollResults options={poll.options} counts={counts} highlightOptionId={myOptionId} />
            <details className="mt-4">
              <summary className="body-2xs cursor-pointer list-none font-bold uppercase text-text-3 transition-colors hover:text-text-5 [&::-webkit-details-marker]:hidden">
                Change your vote
              </summary>
              <VoteForm poll={poll} defaultOptionId={myOptionId} />
            </details>
          </>
        ) : (
          <VoteForm poll={poll} />
        )}
      </div>
    </article>
  );
}

function VoteForm({
  poll,
  defaultOptionId = null,
}: {
  poll: PollCardPoll;
  defaultOptionId?: string | null;
}) {
  return (
    <form action={votePoll} className="mt-3 space-y-2">
      <input type="hidden" name="pollId" value={poll.id} />
      {poll.options.map((o) => (
        <label
          key={o.id}
          className="body-s flex cursor-pointer items-center gap-3 rounded-md border border-surface-4 bg-surface-1 px-4 py-2.5 font-semibold text-text-5 transition-colors hover:bg-surface-4 has-checked:border-text-5"
        >
          <input
            type="radio"
            name="optionId"
            value={o.id}
            required
            defaultChecked={o.id === defaultOptionId}
            className="accent-[color:var(--f1-text-5)]"
          />
          {o.label}
        </label>
      ))}
      <SubmitButton
        label={defaultOptionId ? "Update vote" : "Vote"}
        pendingLabel="Saving…"
        className="mt-3"
      />
    </form>
  );
}
