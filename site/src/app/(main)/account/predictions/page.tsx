import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq, inArray } from "drizzle-orm";
import { format } from "date-fns";
import { db, pollVotes } from "@ctr/db";
import { requireFan } from "@/lib/fan-auth";
import { AccountNav } from "@/components/fanzone/account-nav";
import { Chip } from "@/components/fanzone/chip";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My predictions",
  description: "Your poll votes and how your picks fared.",
};

export default async function PredictionsPage() {
  const { fan } = await requireFan();

  const votes = await db.query.pollVotes.findMany({
    where: eq(pollVotes.fanId, fan.id),
    with: { poll: { with: { round: true } }, option: true },
    orderBy: [desc(pollVotes.createdAt)],
  });

  // aggregate counts for the closed polls the fan voted in
  const closedPollIds = votes.filter((v) => v.poll.status === "closed").map((v) => v.pollId);
  const countRows = closedPollIds.length
    ? await db
        .select({ pollId: pollVotes.pollId, optionId: pollVotes.optionId, votes: count() })
        .from(pollVotes)
        .where(inArray(pollVotes.pollId, closedPollIds))
        .groupBy(pollVotes.pollId, pollVotes.optionId)
    : [];
  const countsByPoll = new Map<string, Map<string, number>>();
  for (const row of countRows) {
    const inner = countsByPoll.get(row.pollId) ?? new Map<string, number>();
    inner.set(row.optionId, row.votes);
    countsByPoll.set(row.pollId, inner);
  }

  return (
    <main className="bg-surface-3 pb-16">
      <AccountNav active="/account/predictions" />

      <div className="f1-inner pt-8">
        <h1 className="display-xl lg:display-2xl font-black uppercase text-text-5">
          My predictions
        </h1>
        <p className="body-xs mt-2 text-text-3">
          Every poll you have voted in, newest first.
        </p>

        {votes.length === 0 ? (
          <div className="mt-6 rounded-md bg-surface-1 px-6 py-12 text-center md:px-8">
            <p className="display-l font-black uppercase text-text-5">No votes yet</p>
            <p className="body-s mx-auto mt-2 max-w-[440px] text-text-3">
              Head to the polls and back your picks — your record shows up here.
            </p>
            <Link href="/polls" className="btn btn-md btn-brand mt-6">
              Open the polls
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {votes.map((vote) => {
              const { poll, option } = vote;
              const closed = poll.status === "closed";
              const pollCounts = countsByPoll.get(poll.id);
              const myVotes = pollCounts?.get(option.id) ?? 0;
              const total = pollCounts
                ? [...pollCounts.values()].reduce((sum, n) => sum + n, 0)
                : 0;
              const max = pollCounts ? Math.max(...pollCounts.values()) : 0;
              const won = closed && total > 0 && myVotes === max;
              const pct = total > 0 ? Math.round((myVotes / total) * 100) : 0;

              return (
                <article
                  key={`${vote.pollId}:${vote.fanId}`}
                  className="rounded-md bg-surface-1 p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip tone="accent-outline">
                          {poll.kind === "prediction" ? "Prediction" : "Poll"}
                        </Chip>
                        {poll.round ? <Chip tone="outline">{poll.round.name}</Chip> : null}
                        {closed ? (
                          <Chip tone="faint">Closed</Chip>
                        ) : (
                          <Chip tone="green">Open</Chip>
                        )}
                      </div>
                      <h2 className="display-l mt-3 font-medium uppercase text-text-5">
                        {poll.question}
                      </h2>
                      <p className="body-s mt-1.5 text-text-3">
                        Your pick: <span className="font-bold text-brand">{option.label}</span>
                        <span aria-hidden className="mx-1.5">
                          ·
                        </span>
                        voted {format(vote.createdAt, "d MMM yyyy")}
                      </p>
                    </div>

                    {closed ? (
                      <div className="shrink-0 text-right">
                        {won ? (
                          <Chip tone="accent">Winner</Chip>
                        ) : (
                          <Chip tone="outline">Beaten</Chip>
                        )}
                        <p className="body-2xs mt-2 font-semibold text-text-3">
                          <span className="font-digits font-bold text-text-5">{myVotes}</span> of{" "}
                          <span className="font-digits font-bold text-text-5">{total}</span>{" "}
                          {total === 1 ? "vote" : "votes"} (
                          <span className="font-digits font-bold text-text-5">{pct}%</span>)
                        </p>
                      </div>
                    ) : (
                      <p className="body-2xs shrink-0 font-semibold uppercase text-text-3">
                        Results after close
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
