import { PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { createArticleAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  await requirePermission(PERMISSIONS.NEWS_MANAGE);

  return (
    <>
      <PageHeader title="New article" sub="A draft is created immediately — you'll land in the editor." />
      <Card className="max-w-xl">
        <form action={createArticleAction} className="space-y-4">
          <Field label="Working title" hint="Leave empty to start with “Untitled draft”.">
            <Input
              name="title"
              maxLength={255}
              placeholder="Untitled draft"
              autoFocus
              className="text-base"
            />
          </Field>
          <SubmitButton>Create draft →</SubmitButton>
        </form>
      </Card>
    </>
  );
}
