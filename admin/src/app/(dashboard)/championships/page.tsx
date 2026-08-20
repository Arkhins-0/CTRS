import Link from "next/link";
import { Badge } from "@ctr/ui";
import { db, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { EmptyState, LinkButton, PageHeader, Table } from "@/components/ui";
import { CHAMPIONSHIP_TYPES } from "./championship-form";

export const dynamic = "force-dynamic";

const TYPE_LABELS = new Map<string, string>(CHAMPIONSHIP_TYPES.map((t) => [t.value, t.label]));

export default async function ChampionshipsPage() {
  await requirePermission(PERMISSIONS.RACES_MANAGE);

  const rows = await db.query.championships.findMany({
    orderBy: (t, { asc }) => [asc(t.sort), asc(t.shortName)],
    with: {
      logo: { columns: { path: true } },
      seasons: { columns: { id: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Championships"
        sub={`${rows.length} championship${rows.length === 1 ? "" : "s"} — each runs its own seasons, rounds and standings`}
        actions={<LinkButton href="/championships/new">New championship</LinkButton>}
      />

      {rows.length ? (
        <Table
          head={
            <>
              <th className="w-14" />
              <th>Short name</th>
              <th>Name</th>
              <th>Type</th>
              <th>Colours</th>
              <th>Active</th>
              <th className="text-right">Seasons</th>
              <th className="w-16" />
            </>
          }
        >
          {rows.map((c) => (
            <tr key={c.id}>
              <td>
                {c.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={publicUrl(variantKey(c.logo.path, "thumb"))}
                    alt={`${c.shortName} logo`}
                    className="size-9 border border-warm-grey object-contain"
                  />
                ) : (
                  <span
                    className="flex size-9 items-center justify-center text-[10px] font-black text-white"
                    style={{ backgroundColor: c.primaryColor }}
                  >
                    {c.shortName.slice(0, 3)}
                  </span>
                )}
              </td>
              <td className="font-black uppercase">
                <Link href={`/championships/${c.id}`} className="hover:text-f1-red">
                  {c.shortName}
                </Link>
              </td>
              <td>
                <Link href={`/championships/${c.id}`} className="font-bold hover:text-f1-red">
                  {c.name}
                </Link>
              </td>
              <td className="text-f1-grey">{TYPE_LABELS.get(c.type) ?? c.type}</td>
              <td>
                <span className="inline-flex items-center gap-1">
                  <span
                    aria-hidden
                    title={c.primaryColor}
                    className="inline-block size-4 rounded-sm border border-warm-grey"
                    style={{ backgroundColor: c.primaryColor }}
                  />
                  {c.secondaryColor ? (
                    <span
                      aria-hidden
                      title={c.secondaryColor}
                      className="inline-block size-4 rounded-sm border border-warm-grey"
                      style={{ backgroundColor: c.secondaryColor }}
                    />
                  ) : null}
                </span>
              </td>
              <td>{c.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="grey">Inactive</Badge>}</td>
              <td className="text-right font-bold">{c.seasons.length}</td>
              <td className="text-right">
                <Link
                  href={`/championships/${c.id}`}
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
          title="No championships yet"
          hint="Create the first championship, then add its seasons, rounds and entries."
        />
      )}
    </>
  );
}
