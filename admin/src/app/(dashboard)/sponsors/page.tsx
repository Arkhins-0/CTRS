import Link from "next/link";
import { db, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { MediaPickerInput } from "@/components/media/media-picker";
import { Card, EmptyState, Field, Input, PageHeader, Select, Table } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { createSponsorAction, deleteSponsorAction, toggleSponsorAction } from "./actions";

export const dynamic = "force-dynamic";

const TIER_LABELS: Record<string, string> = {
  global_partner: "Global Partner",
  official_partner: "Official Partner",
  supplier: "Supplier",
};

type SponsorRow = {
  id: string;
  name: string;
  tier: string;
  url: string | null;
  sort: number;
  isActive: boolean;
  logo: { path: string; alt: string | null } | null;
};

function Logo({ sponsor, className }: { sponsor: SponsorRow; className: string }) {
  if (!sponsor.logo) {
    return (
      <span
        className={`flex items-center justify-center border border-dashed border-line text-[9px] font-bold uppercase text-fg-faint ${className}`}
      >
        None
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={publicUrl(variantKey(sponsor.logo.path, "thumb"))}
      alt={sponsor.logo.alt ?? sponsor.name}
      className={`border border-line bg-surface object-contain p-0.5 ${className}`}
    />
  );
}

function ActiveToggle({ sponsor }: { sponsor: SponsorRow }) {
  return (
    <form action={toggleSponsorAction}>
      <input type="hidden" name="sponsorId" value={sponsor.id} />
      <button
        className={`inline-block px-2 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset transition-opacity hover:opacity-80 ${
          sponsor.isActive
            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
            : "bg-panel text-fg-muted ring-line"
        }`}
        title={sponsor.isActive ? "Click to deactivate" : "Click to activate"}
      >
        {sponsor.isActive ? "Active" : "Inactive"}
      </button>
    </form>
  );
}

export default async function SponsorsPage() {
  await requirePermission(PERMISSIONS.PAGES_MANAGE);

  const rows = (await db.query.sponsors.findMany({
    orderBy: (t, { asc }) => [asc(t.sort), asc(t.name)],
    with: { logo: { columns: { path: true, alt: true } } },
  })) as SponsorRow[];

  return (
    <>
      <PageHeader title="Sponsors" sub="Partners shown in the sponsor grid across the public site." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {rows.length ? (
            <>
              {/*
                * Below lg the seven-column table becomes a card per sponsor.
                * Side-scrolling a table on a phone hides the Actions column
                * behind a swipe, which is exactly the column you came for.
                */}
              <ul className="grid gap-3 lg:hidden">
                {rows.map((s) => (
                  <li key={s.id}>
                    <Card className="p-3">
                      <div className="flex items-start gap-3">
                        <Logo sponsor={s} className="h-10 w-14 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/sponsors/${s.id}`}
                            className="block truncate font-bold text-fg hover:text-accent"
                          >
                            {s.name}
                          </Link>
                          <p className="truncate text-xs text-fg-muted">
                            {TIER_LABELS[s.tier] ?? s.tier} · sort {s.sort}
                          </p>
                          {s.url ? (
                            <p className="truncate text-[11px] text-fg-faint">{s.url}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                        <ActiveToggle sponsor={s} />
                        <Link
                          href={`/sponsors/${s.id}`}
                          className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
                        >
                          Edit
                        </Link>
                        <form action={deleteSponsorAction}>
                          <input type="hidden" name="sponsorId" value={s.id} />
                          <ConfirmSubmit message={`Delete sponsor "${s.name}"?`}>Delete</ConfirmSubmit>
                        </form>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>

              <div className="hidden lg:block">
                <Table
                  head={
                    <>
                      <th className="w-16">Logo</th>
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
                        <Logo sponsor={s} className="h-9 w-12" />
                      </td>
                      <td>
                        <Link
                          href={`/sponsors/${s.id}`}
                          className="font-bold hover:text-accent"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-fg-muted">
                        {TIER_LABELS[s.tier] ?? s.tier}
                      </td>
                      <td className="max-w-48 truncate text-fg-muted">{s.url ?? "—"}</td>
                      <td>{s.sort}</td>
                      <td>
                        <ActiveToggle sponsor={s} />
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/sponsors/${s.id}`}
                            className="text-xs font-bold uppercase text-accent hover:underline"
                          >
                            Edit
                          </Link>
                          <form action={deleteSponsorAction}>
                            <input type="hidden" name="sponsorId" value={s.id} />
                            <ConfirmSubmit message={`Delete sponsor "${s.name}"?`}>
                              Delete
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            </>
          ) : (
            <EmptyState
              title="No sponsors yet"
              hint="Add the first partner with the Add sponsor form."
            />
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
            <Field label="Logo">
              <MediaPickerInput name="logoMediaId" label="Choose logo" />
            </Field>
            <SubmitButton>Add sponsor</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
