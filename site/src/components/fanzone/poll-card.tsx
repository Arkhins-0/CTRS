import Link from "next/link";
import { format } from "date-fns";
import { Badge, ChamferCard } from "@ctr/ui";
import { votePoll } from "@/app/(main)/polls/actions";
import { PollResults } from "./poll-results";
import { SubmitButton } from "./submit-button";

export type PollCardPoll = {
  id: string;
  question: string;
  kind: "poll" | "prediction";
  status: "draft" | "open" | "closed";
  closesAt: Date | null;
  grandPrix: { name: string } | null;
  options: { id: string; label: string; sort: number }[];
};

/** One poll as a card: kind badge, question, then vote form / results. */
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
    <ChamferCard className="flex h-full flex-col border border-warm-grey bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={poll.kind === "prediction" ? "dark" : "red"}>
          {poll.kind === "prediction" ? "Prediction" : "Poll"}
        </Badge>
        {poll.grandPrix ? <Badge tone="grey">{poll.grandPrix.name}</Badge> : null}
        {closed ? <Badge tone="outline">Closed</Badge> : null}
      </div>

      <h3 className="mt-3 text-lg font-black uppercase tracking-tight text-carbon">
        {poll.question}
      </h3>
      {!closed && poll.closesAt ? (
        <p className="mt-1 text-xs font-semibold text-f1-grey">
          Closes {format(poll.closesAt, "d MMM yyyy")}
        </p>
      ) : null}

      <div className="mt-4 flex-1">
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
                  className="border border-warm-grey bg-off-white px-3 py-2 text-sm font-semibold text-f1-grey-light"
                >
                  {o.label}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-bold uppercase tracking-wide text-f1-red hover:underline"
            >
              Sign in to vote →
            </Link>
          </>
        ) : voted ? (
          <>
            <PollResults options={poll.options} counts={counts} highlightOptionId={myOptionId} />
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-f1-grey hover:text-f1-red">
                Change your vote
              </summary>
              <VoteForm poll={poll} defaultOptionId={myOptionId} />
            </details>
          </>
        ) : (
          <VoteForm poll={poll} />
        )}
      </div>
    </ChamferCard>
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
    <form action={votePoll} className="mt-1 space-y-2">
      <input type="hidden" name="pollId" value={poll.id} />
      {poll.options.map((o) => (
        <label
          key={o.id}
          className="flex cursor-pointer items-center gap-3 border border-warm-grey px-3 py-2 text-sm font-semibold text-carbon transition-colors hover:border-f1-red"
        >
          <input
            type="radio"
            name="optionId"
            value={o.id}
            required
            defaultChecked={o.id === defaultOptionId}
            className="accent-f1-red"
          />
          {o.label}
        </label>
      ))}
      <SubmitButton
        label={defaultOptionId ? "Update vote" : "Vote"}
        pendingLabel="Saving…"
        className="mt-2"
      />
    </form>
  );
}
