import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq, inArray } from "drizzle-orm";
import { format } from "date-fns";
import { db, pollVotes } from "@ctr/db";
import { Badge, ChamferCard, SectionHeading } from "@ctr/ui";
import { requireFan } from "@/lib/fan-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My predictions",
  description: "Your poll votes and how your picks fared.",
};

export default async function PredictionsPage() {
  const { fan } = await requireFan();

  const votes = await db.query.pollVotes.findMany({
    where: eq(pollVotes.fanId, fan.id),
    with: { poll: { with: { grandPrix: true } }, option: true },
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
    <main className="mx-auto max-w-7xl px-4 py-8">
      <SectionHeading
        right={
          <Link href="/account" className="uppercase text-f1-red hover:underline">
            ← My account
          </Link>
        }
      >
        My predictions
      </SectionHeading>

      {votes.length === 0 ? (
        <ChamferCard className="mt-6 border border-dashed border-f1-grey-light bg-white p-10 text-center">
          <p className="text-lg font-black uppercase tracking-tight text-carbon">No votes yet</p>
          <p className="mt-2 text-sm text-f1-grey">
            Head to the polls and back your picks — your record shows up here.
          </p>
          <Link
            href="/polls"
            className="chamfer-tr mt-5 inline-block bg-f1-red px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-f1-red-dark"
          >
            Open the polls
          </Link>
        </ChamferCard>
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
              <ChamferCard
                key={`${vote.pollId}:${vote.fanId}`}
                className="border border-warm-grey bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={poll.kind === "prediction" ? "dark" : "red"}>
                        {poll.kind === "prediction" ? "Prediction" : "Poll"}
                      </Badge>
                      {poll.grandPrix ? <Badge tone="grey">{poll.grandPrix.name}</Badge> : null}
                      {closed ? (
                        <Badge tone="outline">Closed</Badge>
                      ) : (
                        <Badge tone="green">Open</Badge>
                      )}
                    </div>
                    <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-carbon">
                      {poll.question}
                    </h3>
                    <p className="mt-1 text-sm text-f1-grey">
                      Your pick:{" "}
                      <span className="font-bold text-f1-red">{option.label}</span>
                      <span className="mx-1.5 text-f1-grey-light">·</span>
                      voted {format(vote.createdAt, "d MMM yyyy")}
                    </p>
                  </div>

                  {closed ? (
                    <div className="shrink-0 text-right">
                      {won ? <Badge tone="green">Winner</Badge> : <Badge tone="grey">Beaten</Badge>}
                      <p className="mt-2 text-xs font-semibold text-f1-grey">
                        {myVotes} of {total} {total === 1 ? "vote" : "votes"} ({pct}%)
                      </p>
                    </div>
                  ) : (
                    <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-f1-grey">
                      Results after close
                    </p>
                  )}
                </div>
              </ChamferCard>
            );
          })}
        </div>
      )}
    </main>
  );
}
