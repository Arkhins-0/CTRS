import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, PERMISSIONS, sponsors } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, EmptyState, Field, Input, PageHeader, Select, Table } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { createSponsorAction, deleteSponsorAction, toggleSponsorAction } from "./actions";

export const dynamic = "force-dynamic";

const TIER_LABELS: Record<string, string> = {
  global_partner: "Global Partner",
  official_partner: "Official Partner",
  supplier: "Supplier",
};

export default async function SponsorsPage() {
  await requirePermission(PERMISSIONS.PAGES_MANAGE);

  const rows = await db.select().from(sponsors).orderBy(asc(sponsors.sort), asc(sponsors.name));

  return (
    <>
      <PageHeader title="Sponsors" sub="Partners shown in the sponsor grid across the public site." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {rows.length ? (
            <Table
              head={
                <>
                  <th>Name</th>
                  <th>Tier</th>
                  <th>URL</th>
                  <th>Sort</th>
                  <th>Active</th>
                  <th className="text-right">Actions</th>
                </>
              }
            >
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/sponsors/${s.id}`} className="font-bold hover:text-f1-red">
                      {s.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-f1-grey">{TIER_LABELS[s.tier] ?? s.tier}</td>
                  <td className="max-w-48 truncate text-f1-grey">{s.url ?? "—"}</td>
                  <td>{s.sort}</td>
                  <td>
                    <form action={toggleSponsorAction}>
                      <input type="hidden" name="sponsorId" value={s.id} />
                      <button
                        className={`inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                          s.isActive ? "bg-emerald-600 text-white" : "bg-warm-grey text-carbon"
                        } hover:opacity-80`}
                        title={s.isActive ? "Click to deactivate" : "Click to activate"}
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </button>
                    </form>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/sponsors/${s.id}`}
                        className="text-xs font-bold uppercase text-f1-red hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteSponsorAction}>
                        <input type="hidden" name="sponsorId" value={s.id} />
                        <ConfirmSubmit message={`Delete sponsor "${s.name}"?`}>Delete</ConfirmSubmit>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState title="No sponsors yet" hint="Add the first partner with the form on the right." />
          )}
        </div>

        <Card className="h-fit">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Add sponsor</h2>
          <form action={createSponsorAction} className="space-y-4">
            <Field label="Name">
              <Input name="name" required maxLength={200} />
            </Field>
            <Field label="Tier">
              <Select name="tier" defaultValue="official_partner">
                <option value="global_partner">Global Partner</option>
                <option value="official_partner">Official Partner</option>
                <option value="supplier">Supplier</option>
              </Select>
            </Field>
            <Field label="URL">
              <Input name="url" type="url" maxLength={500} placeholder="https://…" />
            </Field>
            <Field label="Sort" hint="Lower numbers appear first.">
              <Input name="sort" type="number" min={0} defaultValue={0} />
            </Field>
            <SubmitButton>Add sponsor</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
