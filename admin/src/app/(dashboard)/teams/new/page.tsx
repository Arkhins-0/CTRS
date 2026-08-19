import { PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, Field, Input, LinkButton, PageHeader, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { createTeamAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewTeamPage() {
  await requirePermission(PERMISSIONS.TEAMS_MANAGE);

  return (
    <>
      <PageHeader
        title="New Team"
        sub="Create the canonical team — season entries and cars are added on the team page"
        actions={<LinkButton href="/teams" variant="ghost">Back to teams</LinkButton>}
      />

      <Card className="max-w-3xl">
        <form action={createTeamAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" hint="e.g. McLaren — the slug is generated from this.">
            <Input name="name" required maxLength={120} placeholder="McLaren" />
          </Field>
          <Field label="Full name">
            <Input name="fullName" maxLength={200} placeholder="McLaren Racing Limited" />
          </Field>
          <Field label="Base">
            <Input name="base" maxLength={200} placeholder="Woking, United Kingdom" />
          </Field>
          <Field label="Country code" hint="2-letter ISO code, e.g. GB">
            <Input name="countryCode" maxLength={2} className="uppercase" />
          </Field>
          <Field label="First entry year">
            <Input name="firstEntryYear" type="number" min={1900} max={2100} placeholder="1966" />
          </Field>
          <Field label="World championships">
            <Input name="worldChampionships" type="number" min={0} max={50} defaultValue={0} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea name="description" rows={5} />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton>Create team</SubmitButton>
          </div>
        </form>
      </Card>
    </>
  );
}
