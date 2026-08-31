import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, PERMISSIONS, sponsors } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { MediaPickerInput } from "@/components/media/media-picker";
import { Card, Field, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { deleteSponsorAction, updateSponsorAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function SponsorEditor({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const { id } = await params;

  const sponsor = await db.query.sponsors.findFirst({
    where: eq(sponsors.id, id),
    with: { logo: { columns: { path: true } } },
  });
  if (!sponsor) notFound();

  const logoThumb = sponsor.logo ? publicUrl(variantKey(sponsor.logo.path, "thumb")) : null;

  return (
    <>
      <PageHeader
        title={sponsor.name}
        sub="Edit sponsor details."
        actions={<LinkButton href="/sponsors" variant="ghost">← All sponsors</LinkButton>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form action={updateSponsorAction} className="space-y-4">
            <input type="hidden" name="sponsorId" value={sponsor.id} />
            <Field label="Name">
              <Input name="name" required maxLength={200} defaultValue={sponsor.name} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tier">
                <Select name="tier" defaultValue={sponsor.tier}>
                  <option value="global_partner">Global Partner</option>
                  <option value="official_partner">Official Partner</option>
                  <option value="supplier">Supplier</option>
                </Select>
              </Field>
              <Field label="Sort" hint="Lower numbers appear first.">
                <Input name="sort" type="number" min={0} defaultValue={sponsor.sort} />
              </Field>
            </div>
            <Field label="URL">
              <Input name="url" type="url" maxLength={500} defaultValue={sponsor.url ?? ""} placeholder="https://…" />
            </Field>
            <Field label="Logo" hint="Shown in the sponsor grids across the public site.">
              <MediaPickerInput
                name="logoMediaId"
                label="Choose logo"
                initialId={sponsor.logoMediaId}
                initialUrl={logoThumb}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-fg">
              <input type="checkbox" name="isActive" defaultChecked={sponsor.isActive} className="size-5 accent-accent" />
              Active — shown on the public site
            </label>
            <SubmitButton>Save sponsor</SubmitButton>
          </form>
        </Card>

        <Card className="h-fit border-f1-red/40">
          <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-f1-red">Danger zone</h2>
          <p className="mb-3 text-sm text-fg-muted">Removes the sponsor from every sponsor grid.</p>
          <form action={deleteSponsorAction}>
            <input type="hidden" name="sponsorId" value={sponsor.id} />
            <ConfirmSubmit message={`Delete sponsor "${sponsor.name}"? This cannot be undone.`}>
              Delete sponsor
            </ConfirmSubmit>
          </form>
        </Card>
      </div>
    </>
  );
}
