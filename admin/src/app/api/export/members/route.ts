import { asc } from "drizzle-orm";
import { PERMISSIONS, db, members } from "@ctr/db";
import { checkPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { csvResponse, toCsv } from "@/lib/csv";
import { ROLE_LABELS } from "@/lib/member-roles";

export const dynamic = "force-dynamic";

/**
 * Full member export for CMS staff.
 *
 * This is a personal-data export (names, emails, phone numbers), so it is
 * gated on members.manage and written to the audit log — someone should be
 * able to answer "who pulled the roster, and when".
 */
export async function GET() {
  const session = await checkPermission(PERMISSIONS.MEMBERS_MANAGE);
  if (!session) return new Response("Forbidden", { status: 403 });

  const rows = await db.query.members.findMany({
    orderBy: asc(members.displayName),
    with: { team: { columns: { name: true } } },
  });

  const csv = toCsv(
    ["Name", "Email", "Phone", "Role", "Team", "Position", "Active", "Last login", "Joined"],
    rows.map((m) => [
      m.displayName,
      m.email,
      m.phone,
      ROLE_LABELS[m.role],
      m.team?.name ?? "",
      m.jobTitle,
      m.isActive ? "yes" : "no",
      m.lastLoginAt ? m.lastLoginAt.toISOString().slice(0, 10) : "",
      m.createdAt.toISOString().slice(0, 10),
    ]),
  );

  await writeAudit({
    actorId: session.user.id,
    action: "member.export",
    entityType: "member",
    diff: { after: { rows: rows.length } },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(`ctr-members-${stamp}.csv`, csv);
}
