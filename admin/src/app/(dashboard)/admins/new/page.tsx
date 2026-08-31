import { PERMISSIONS, ROLE_DEFINITIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, Field, Input, LinkButton, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { createAdminAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewAdmin() {
  await requirePermission(PERMISSIONS.ADMINS_MANAGE);

  return (
    <>
      <PageHeader
        title="New admin"
        sub="Creates an active CMS account with the selected roles."
        actions={<LinkButton href="/admins" variant="ghost">← All admins</LinkButton>}
      />

      <Card className="max-w-2xl">
        <form action={createAdminAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name">
              <Input name="displayName" required maxLength={120} placeholder="Jane Doe" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required maxLength={255} placeholder="jane@ctrsports.com" />
            </Field>
          </div>
          <Field label="Password" hint="Minimum 10 characters.">
            <Input name="password" type="password" required minLength={10} autoComplete="new-password" />
          </Field>

          <div>
            <p className="mb-2 block text-xs font-bold uppercase tracking-wide text-fg-muted">Roles</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(ROLE_DEFINITIONS).map(([key, def]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 border border-line bg-surface px-3 py-2 text-sm font-semibold text-fg hover:border-fg-faint"
                >
                  <input type="checkbox" name="roles" value={key} className="size-4 accent-f1-red" />
                  {def.name}
                </label>
              ))}
            </div>
          </div>

          <SubmitButton>Create admin</SubmitButton>
        </form>
      </Card>
    </>
  );
}
