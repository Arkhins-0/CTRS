import { PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { createGalleryAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission(PERMISSIONS.VIDEOS_MANAGE);
  const { error } = await searchParams;

  return (
    <>
      <PageHeader title="New gallery" sub="Create the gallery first, then add images in the editor." />

      {error === "invalid" ? (
        <p className="mb-4 border border-f1-red bg-white p-3 text-sm font-bold text-f1-red">
          A title is required.
        </p>
      ) : null}

      <Card className="max-w-xl">
        <form action={createGalleryAction} className="space-y-4">
          <Field label="Title">
            <Input name="title" required maxLength={255} autoFocus />
          </Field>
          <Field label="Description">
            <Textarea name="description" maxLength={10000} />
          </Field>
          <SubmitButton>Create gallery →</SubmitButton>
        </form>
      </Card>
    </>
  );
}
