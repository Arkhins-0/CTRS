import Link from "next/link";
import { CountryFlag } from "@ctr/ui";
import { db, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, LinkButton, PageHeader, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  await requirePermission(PERMISSIONS.TEAMS_MANAGE);

  const rows = await db.query.teams.findMany({
    orderBy: (t, { asc }) => [asc(t.name)],
    with: { seasonEntries: { columns: { id: true } } },
  });

  return (
    <>
      <PageHeader
        title="Teams & Cars"
        sub={`${rows.length} canonical team${rows.length === 1 ? "" : "s"}`}
        actions={<LinkButton href="/teams/new">New team</LinkButton>}
      />

      {rows.length ? (
        <Table
          head={
            <>
              <th>Team</th>
              <th>Base</th>
              <th className="text-right">Championships</th>
              <th className="text-right">Seasons</th>
              <th className="w-16" />
            </>
          }
        >
          {rows.map((t) => (
            <tr key={t.id}>
              <td>
                <Link href={`/teams/${t.id}`} className="inline-flex items-center gap-1.5 font-bold hover:text-f1-red">
                  <CountryFlag code={t.countryCode} /> {t.name}
                </Link>
                {t.fullName ? <span className="block text-xs text-fg-muted">{t.fullName}</span> : null}
              </td>
              <td className="text-fg-muted">{t.base ?? "—"}</td>
              <td className="text-right font-black">{t.worldChampionships}</td>
              <td className="text-right font-bold">{t.seasonEntries.length}</td>
              <td className="text-right">
                <Link
                  href={`/teams/${t.id}`}
                  className="text-xs font-bold uppercase text-f1-red hover:underline"
                >
                  Edit →
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title="No teams yet" hint="Create the first canonical team, then add its season entries." />
      )}
    </>
  );
}
