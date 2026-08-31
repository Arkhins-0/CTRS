import Link from "next/link";
import { asc } from "drizzle-orm";
import { CountryFlag } from "@ctr/ui";
import { circuits, db, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, LinkButton, PageHeader, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CircuitsPage() {
  await requirePermission(PERMISSIONS.RACES_MANAGE);

  const rows = await db.select().from(circuits).orderBy(asc(circuits.name));

  return (
    <>
      <PageHeader
        title="Circuits"
        sub={`${rows.length} circuit${rows.length === 1 ? "" : "s"} on file`}
        actions={<LinkButton href="/circuits/new">New circuit</LinkButton>}
      />

      {rows.length ? (
        <Table
          head={
            <>
              <th>Circuit</th>
              <th>Locality</th>
              <th>Country</th>
              <th className="text-right">Length</th>
              <th className="text-right">Laps</th>
              <th className="w-16" />
            </>
          }
        >
          {rows.map((c) => (
            <tr key={c.id}>
              <td>
                <Link href={`/circuits/${c.id}`} className="font-bold hover:text-f1-red">
                  {c.name}
                </Link>
              </td>
              <td className="text-fg-muted">{c.locality ?? "—"}</td>
              <td>
                <span className="inline-flex items-center gap-1.5">
                  <CountryFlag code={c.countryCode} /> {c.country}
                </span>
              </td>
              <td className="text-right">{c.lengthKm != null ? `${c.lengthKm.toFixed(3)} km` : "—"}</td>
              <td className="text-right font-bold">{c.raceLaps ?? "—"}</td>
              <td className="text-right">
                <Link
                  href={`/circuits/${c.id}`}
                  className="text-xs font-bold uppercase text-f1-red hover:underline"
                >
                  Edit →
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title="No circuits yet" hint="Add the first circuit to start building the calendar." />
      )}
    </>
  );
}
