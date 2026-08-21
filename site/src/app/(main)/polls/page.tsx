import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db, polls, pollVotes } from "@ctr/db";
import { getFanSession } from "@/lib/fan-auth";
import { PollCard } from "@/components/fanzone/poll-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Polls & Predictions",
  description: "Vote in fan polls and call the race weekend before lights out.",
};

export default async function PollsPage() {
  const session = await getFanSession();

  const [openPolls, closedPolls] = await Promise.all([
    db.query.polls.findMany({
      where: eq(polls.status, "open"),
      with: {
        options: { orderBy: (o, { asc }) => [asc(o.sort)] },
        round: { columns: { name: true } },
      },
      orderBy: [desc(polls.createdAt)],
    }),
    db.query.polls.findMany({
      where: eq(polls.status, "closed"),
      with: {
        options: { orderBy: (o, { asc }) => [asc(o.sort)] },
        round: { columns: { name: true } },
      },
      orderBy: [desc(polls.createdAt)],
      limit: 5,
    }),
  ]);

  const allPollIds = [...openPolls, ...closedPolls].map((p) => p.id);

  const [countRows, myVoteRows] = await Promise.all([
    allPollIds.length
      ? db
          .select({ pollId: pollVotes.pollId, optionId: pollVotes.optionId, votes: count() })
          .from(pollVotes)
          .where(inArray(pollVotes.pollId, allPollIds))
          .groupBy(pollVotes.pollId, pollVotes.optionId)
      : Promise.resolve([]),
    session && allPollIds.length
      ? db
          .select({ pollId: pollVotes.pollId, optionId: pollVotes.optionId })
          .from(pollVotes)
          .where(
            and(eq(pollVotes.fanId, session.fan.id), inArray(pollVotes.pollId, allPollIds)),
          )
      : Promise.resolve([]),
  ]);

  const countsByPoll: Record<string, Record<string, number>> = {};
  for (const row of countRows) {
    (countsByPoll[row.pollId] ??= {})[row.optionId] = row.votes;
  }
  const myVoteByPoll: Record<string, string> = {};
  for (const row of myVoteRows) myVoteByPoll[row.pollId] = row.optionId;

  return (
    <main className="bg-surface-3 pb-16">
      {/* fan zone band */}
      <div className="f1-inner pt-8">
        <p className="display-s font-medium uppercase text-brand">Fan zone</p>
        <h1 className="display-xl lg:display-2xl mt-1 font-black uppercase text-text-5">
          Polls &amp; Predictions
        </h1>
        <p className="body-s mt-2 max-w-[680px] text-text-3">
          Have your say and call the weekend before lights out — one vote per poll, and you can
          change your pick until it closes.
        </p>
      </div>

      <div className="f1-inner pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="display-l font-black uppercase text-text-5">Open votes</h2>
          {!session ? (
            <Link href="/login" className="body-s font-semibold text-brand hover:underline">
              Sign in to vote
            </Link>
          ) : null}
        </div>

        {openPolls.length === 0 ? (
          <div className="mt-4 rounded-md bg-surface-1 px-6 py-12 text-center md:px-8">
            <p className="display-l font-black uppercase text-text-5">
              No open polls right now
            </p>
            <p className="body-s mt-2 text-text-3">Check back on race week.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {openPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                counts={countsByPoll[poll.id] ?? {}}
                signedIn={session !== null}
                myOptionId={myVoteByPoll[poll.id] ?? null}
              />
            ))}
          </div>
        )}

        {closedPolls.length > 0 ? (
          <>
            <h2 className="display-l mt-12 font-black uppercase text-text-5">Recent results</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {closedPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  counts={countsByPoll[poll.id] ?? {}}
                  signedIn={session !== null}
                  myOptionId={myVoteByPoll[poll.id] ?? null}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
