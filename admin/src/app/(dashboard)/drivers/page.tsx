import Link from "next/link";
import { ilike, or } from "drizzle-orm";
import { Badge, CountryFlag } from "@ctr/ui";
import { db, drivers, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { EmptyState, Input, LinkButton, PageHeader, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission(PERMISSIONS.DRIVERS_MANAGE);
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const rows = await db.query.drivers.findMany({
    where: q
      ? or(
          ilike(drivers.firstName, `%${q}%`),
          ilike(drivers.lastName, `%${q}%`),
          ilike(drivers.code, `%${q}%`),
        )
      : undefined,
    orderBy: (t, { asc }) => [asc(t.lastName), asc(t.firstName)],
    with: {
      headshot: { columns: { path: true, alt: true } },
      seasonEntries: {
        orderBy: (t, { desc }) => [desc(t.seasonYear)],
        with: { teamSeasonEntry: { columns: { shortName: true, seasonYear: true, primaryColor: true } } },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Drivers"
        sub={`${rows.length} driver${rows.length === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}`}
        actions={<LinkButton href="/drivers/new">New driver</LinkButton>}
      />

      <form method="get" className="mb-4 flex max-w-sm gap-2">
        <Input name="q" defaultValue={q} placeholder="Search by name or code…" aria-label="Search drivers" />
        <button
          type="submit"
          className="chamfer-tr bg-carbon px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-carbon-700"
        >
          Search
        </button>
      </form>

      {rows.length ? (
        <Table
          head={
            <>
              <th className="w-14" />
              <th>Driver</th>
              <th>Code</th>
              <th>Country</th>
              <th>Current team</th>
              <th>Status</th>
              <th className="w-16" />
            </>
          }
        >
          {rows.map((d) => {
            const latest = d.seasonEntries[0];
            return (
              <tr key={d.id}>
                <td>
                  {d.headshot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={publicUrl(d.headshot.path)}
                      alt={d.headshot.alt ?? `${d.firstName} ${d.lastName}`}
                      className="size-9 rounded-full border border-warm-grey object-cover"
                    />
                  ) : (
                    <span className="flex size-9 items-center justify-center rounded-full bg-carbon text-[10px] font-black text-white">
                      {d.code}
                    </span>
                  )}
                </td>
                <td>
                  <Link href={`/drivers/${d.id}`} className="font-bold hover:text-f1-red">
                    {d.firstName} <span className="uppercase">{d.lastName}</span>
                  </Link>
                </td>
                <td className="font-black">{d.code}</td>
                <td>
                  <CountryFlag code={d.countryCode} className="text-lg" />
                </td>
                <td>
                  {latest ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block h-4 w-1 rounded-sm"
                        style={{ backgroundColor: latest.teamSeasonEntry.primaryColor }}
                      />
                      {latest.teamSeasonEntry.shortName}
                      <span className="text-xs text-f1-grey">({latest.seasonYear})</span>
                    </span>
                  ) : (
                    <span className="text-f1-grey-light">—</span>
                  )}
                </td>
                <td>{d.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="grey">Inactive</Badge>}</td>
                <td className="text-right">
                  <Link
                    href={`/drivers/${d.id}`}
                    className="text-xs font-bold uppercase text-f1-red hover:underline"
                  >
                    Edit →
                  </Link>
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <EmptyState
          title={q ? `No drivers match “${q}”` : "No drivers yet"}
          hint={q ? "Try a different search." : "Create the first driver profile."}
        />
      )}
    </>
  );
}
