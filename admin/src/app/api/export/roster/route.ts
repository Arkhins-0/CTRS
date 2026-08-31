import { and, asc, eq, inArray } from "drizzle-orm";
import { db, memberRoundRsvps, members, rounds } from "@ctr/db";
import { getMemberSession } from "@/lib/member-auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { ROLE_LABELS } from "@/lib/member-roles";

export const dynamic = "force-dynamic";

/**
 * Team roster + availability export for a team admin.
 *
 * Scoped hard to the caller's own team — the team id comes from the session
 * and there is no parameter to override it, so this endpoint cannot be walked
 * to read another team's crew list.
 */
export async function GET() {
  const session = await getMemberSession();
  if (!session || session.member.role !== "team_admin" || !session.member.teamId) {
    return new Response("Forbidden", { status: 403 });
  }
  const teamId = session.member.teamId;

  const [roster, upcoming] = await Promise.all([
    db.query.members.findMany({
      where: eq(members.teamId, teamId),
      orderBy: asc(members.displayName),
      columns: {
        id: true,
        displayName: true,
        email: true,
        phone: true,
        role: true,
        jobTitle: true,
        isActive: true,
      },
    }),
    db.query.rounds.findMany({
      orderBy: asc(rounds.startDate),
      columns: { id: true, round: true, name: true, startDate: true },
    }),
  ]);

  const answers = roster.length
    ? await db.query.memberRoundRsvps.findMany({
        where: inArray(
          memberRoundRsvps.memberId,
          roster.map((m) => m.id),
        ),
        columns: { memberId: true, roundId: true, status: true },
      })
    : [];

  // One column per round so the sheet reads as an availability grid.
  const answerKey = new Map(answers.map((a) => [`${a.memberId}:${a.roundId}`, a.status]));
  const roundCols = upcoming.map((r) => `R${r.round} ${r.name}`);

  const csv = toCsv(
    ["Name", "Email", "Phone", "Role", "Position", "Active", ...roundCols],
    roster.map((m) => [
      m.displayName,
      m.email,
      m.phone,
      ROLE_LABELS[m.role],
      m.jobTitle,
      m.isActive ? "yes" : "no",
      ...upcoming.map((r) => answerKey.get(`${m.id}:${r.id}`) ?? ""),
    ]),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(`ctr-roster-${stamp}.csv`, csv);
}
