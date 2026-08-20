import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { Badge } from "@ctr/ui";
import { db, driverSeasonEntries, raceCategories, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, LinkButton, PageHeader, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await requirePermission(PERMISSIONS.RACES_MANAGE);

  const [categories, driverCounts] = await Promise.all([
    db
      .select()
      .from(raceCategories)
      .orderBy(asc(raceCategories.sort), asc(raceCategories.shortName)),
    db
      .select({ categoryId: driverSeasonEntries.categoryId, n: count() })
      .from(driverSeasonEntries)
      .groupBy(driverSeasonEntries.categoryId),
  ]);
  const driversByCategory = new Map(driverCounts.map((c) => [c.categoryId, c.n]));

  return (
    <>
      <PageHeader
        title="Categories"
        sub="Racing classes of the championship — each runs its own sessions and standings."
        actions={<LinkButton href="/categories/new">New category</LinkButton>}
      />

      {categories.length ? (
        <Table
          head={
            <>
              <th className="w-12" />
              <th>Short name</th>
              <th>Name</th>
              <th className="text-right">Sort</th>
              <th>Active</th>
              <th className="text-right">Drivers</th>
              <th className="w-16" />
            </>
          }
        >
          {categories.map((c) => (
            <tr key={c.id}>
              <td>
                <span
                  aria-hidden
                  className="inline-block size-4 rounded-sm border border-warm-grey"
                  style={{ backgroundColor: c.color }}
                />
              </td>
              <td className="font-black uppercase">
                <Link href={`/categories/${c.id}`} className="hover:text-f1-red">
                  {c.shortName}
                </Link>
              </td>
              <td>
                <Link href={`/categories/${c.id}`} className="font-bold hover:text-f1-red">
                  {c.name}
                </Link>
              </td>
              <td className="text-right">{c.sort}</td>
              <td>{c.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="grey">Inactive</Badge>}</td>
              <td className="text-right font-bold">{driversByCategory.get(c.id) ?? 0}</td>
              <td className="text-right">
                <Link
                  href={`/categories/${c.id}`}
                  className="text-xs font-bold uppercase text-f1-red hover:underline"
                >
                  Edit →
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState
          title="No categories yet"
          hint="Create the championship's racing classes — sessions and standings are grouped by them."
        />
      )}
    </>
  );
}
