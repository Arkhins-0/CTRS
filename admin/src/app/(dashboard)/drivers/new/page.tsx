import { PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { MediaPickerInput } from "@/components/media/media-picker";
import { Card, Field, Input, LinkButton, PageHeader, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { createDriverAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewDriverPage() {
  await requirePermission(PERMISSIONS.DRIVERS_MANAGE);

  return (
    <>
      <PageHeader
        title="New Driver"
        sub="Create the driver profile — season entries are added on the driver page"
        actions={<LinkButton href="/drivers" variant="ghost">Back to drivers</LinkButton>}
      />

      <Card className="max-w-3xl">
        <form action={createDriverAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <Input name="firstName" required maxLength={120} placeholder="Max" />
          </Field>
          <Field label="Last name" hint="The slug is generated from the full name.">
            <Input name="lastName" required maxLength={120} placeholder="Verstappen" />
          </Field>
          <Field label="Code" hint="3-letter code, e.g. VER">
            <Input name="code" required maxLength={3} minLength={3} pattern="[A-Za-z]{3}" className="uppercase" placeholder="VER" />
          </Field>
          <Field label="Country code" hint="2-letter ISO code, e.g. NL">
            <Input name="countryCode" maxLength={2} className="uppercase" placeholder="NL" />
          </Field>
          <Field label="Date of birth">
            <Input name="dateOfBirth" type="date" />
          </Field>
          <Field label="Place of birth">
            <Input name="placeOfBirth" maxLength={200} placeholder="Hasselt, Belgium" />
          </Field>
          <Field label="Biography" className="sm:col-span-2">
            <Textarea name="biography" rows={6} />
          </Field>
          <Field label="Headshot" className="sm:col-span-2">
            <MediaPickerInput name="headshotMediaId" />
          </Field>
          <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-carbon">
            <input type="checkbox" name="isActive" defaultChecked className="size-4 accent-f1-red" />
            Active driver
          </label>
          <div className="sm:col-span-2">
            <SubmitButton>Create driver</SubmitButton>
          </div>
        </form>
      </Card>
    </>
  );
}
