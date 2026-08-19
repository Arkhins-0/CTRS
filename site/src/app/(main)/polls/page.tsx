import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db, polls, pollVotes } from "@ctr/db";
import { ChamferCard, SectionHeading } from "@ctr/ui";
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
        grandPrix: { columns: { name: true } },
      },
      orderBy: [desc(polls.createdAt)],
    }),
    db.query.polls.findMany({
      where: eq(polls.status, "closed"),
      with: {
        options: { orderBy: (o, { asc }) => [asc(o.sort)] },
        grandPrix: { columns: { name: true } },
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
    <>
      {/* fan zone band */}
      <div className="border-b-4 border-f1-red bg-carbon-fibre">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-f1-red">Fan zone</p>
          <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Polls &amp; Predictions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-f1-grey-light">
            Have your say and call the weekend before lights out — one vote per poll, and you can
            change your pick until it closes.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <SectionHeading
          right={
            !session ? (
              <Link href="/login" className="uppercase text-f1-red hover:underline">
                Sign in to vote
              </Link>
            ) : undefined
          }
        >
          Open votes
        </SectionHeading>

        {openPolls.length === 0 ? (
          <ChamferCard className="mt-6 border border-dashed border-f1-grey-light bg-white p-10 text-center">
            <p className="text-lg font-black uppercase tracking-tight text-carbon">
              No open polls right now
            </p>
            <p className="mt-2 text-sm text-f1-grey">Check back on race week.</p>
          </ChamferCard>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
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
            <SectionHeading className="mt-12">Recent results</SectionHeading>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
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
      </main>
    </>
  );
}
