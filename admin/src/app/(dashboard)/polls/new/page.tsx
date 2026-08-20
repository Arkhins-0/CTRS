import { PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, Field, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { loadRoundOptions } from "@/components/racing/round-options";
import { createPollAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewPoll() {
  await requirePermission(PERMISSIONS.FANZONE_MANAGE);

  const roundOptions = await loadRoundOptions();

  return (
    <>
      <PageHeader
        title="New poll"
        sub="Created as a draft — add options before opening it."
        actions={<LinkButton href="/polls" variant="ghost">← All polls</LinkButton>}
      />

      <Card className="max-w-2xl">
        <form action={createPollAction} className="space-y-4">
          <Field label="Question">
            <Input name="question" required maxLength={500} placeholder="Who wins the Monaco Grand Prix?" />
          </Field>
          <Field label="Slug" hint="Left blank = generated from the question.">
            <Input name="slug" pattern="[a-z0-9-]*" maxLength={200} placeholder="monaco-gp-winner" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kind">
              <Select name="kind" defaultValue="poll">
                <option value="poll">Poll</option>
                <option value="prediction">Prediction</option>
              </Select>
            </Field>
            <Field label="Round" hint="Optional — links the poll to a race weekend.">
              <Select name="roundId" defaultValue="">
                <option value="">— None —</option>
                {roundOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opens at" hint="Optional.">
              <Input name="opensAt" type="datetime-local" />
            </Field>
            <Field label="Closes at" hint="Optional.">
              <Input name="closesAt" type="datetime-local" />
            </Field>
          </div>
          <SubmitButton>Create draft poll</SubmitButton>
        </form>
      </Card>
    </>
  );
}
