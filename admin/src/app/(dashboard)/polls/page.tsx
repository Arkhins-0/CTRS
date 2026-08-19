import Link from "next/link";
import { format } from "date-fns";
import { count, desc, eq } from "drizzle-orm";
import { db, grandsPrix, PERMISSIONS, polls, pollVotes } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, LinkButton, PageHeader, StatusPill, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PollsIndex() {
  await requirePermission(PERMISSIONS.FANZONE_MANAGE);

  const rows = await db
    .select({
      id: polls.id,
      question: polls.question,
      kind: polls.kind,
      status: polls.status,
      closesAt: polls.closesAt,
      createdAt: polls.createdAt,
      gpName: grandsPrix.name,
      gpYear: grandsPrix.seasonYear,
      votes: count(pollVotes.optionId),
    })
    .from(polls)
    .leftJoin(grandsPrix, eq(polls.grandPrixId, grandsPrix.id))
    .leftJoin(pollVotes, eq(pollVotes.pollId, polls.id))
    .groupBy(polls.id, grandsPrix.name, grandsPrix.seasonYear)
    .orderBy(desc(polls.createdAt));

  return (
    <>
      <PageHeader
        title="Polls & predictions"
        sub="Fan Zone voting — polls and race predictions."
        actions={<LinkButton href="/polls/new">New poll</LinkButton>}
      />

      {rows.length ? (
        <Table
          head={
            <>
              <th>Question</th>
              <th>Kind</th>
              <th>Status</th>
              <th>Grand Prix</th>
              <th>Votes</th>
              <th>Closes</th>
            </>
          }
        >
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/polls/${p.id}`} className="font-bold hover:text-f1-red">
                  {p.question}
                </Link>
              </td>
              <td className="uppercase text-f1-grey">{p.kind}</td>
              <td>
                <StatusPill status={p.status} />
              </td>
              <td className="whitespace-nowrap text-f1-grey">
                {p.gpName ? `${p.gpName} ${p.gpYear}` : "—"}
              </td>
              <td className="font-bold">{p.votes}</td>
              <td className="whitespace-nowrap text-f1-grey">
                {p.closesAt ? format(p.closesAt, "d MMM yyyy HH:mm") : "—"}
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title="No polls yet" hint="Create the first poll or prediction for the Fan Zone." />
      )}
    </>
  );
}
