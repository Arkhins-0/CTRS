import { notFound } from "next/navigation";
import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { adminUsers, db, PERMISSIONS, ROLE_DEFINITIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, Field, Input, LinkButton, PageHeader } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import {
  resetAdminPasswordAction,
  syncAdminRolesAction,
  toggleAdminActiveAction,
  unlockAdminAction,
  updateAdminProfileAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePermission(PERMISSIONS.ADMINS_MANAGE);
  const { id } = await params;
  const { error } = await searchParams;

  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, id),
    with: { userRoles: { with: { role: true } } },
  });
  if (!user) notFound();

  const ownRoleKeys = new Set(user.userRoles.map((ur) => ur.role.key));
  const isSelf = user.id === session.user.id;
  const locked = user.failedLogins >= 10;

  return (
    <>
      <PageHeader
        title={user.displayName}
        sub={`${user.email}${isSelf ? " · this is you" : ""} · last login ${
          user.lastLoginAt ? format(user.lastLoginAt, "d MMM yyyy HH:mm") : "never"
        }`}
        actions={<LinkButton href="/admins" variant="ghost">← All admins</LinkButton>}
      />

      {error === "self" && (
        <div className="mb-4 border border-f1-red bg-surface px-4 py-3 text-sm font-bold text-f1-red">
          You cannot deactivate your own account.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Profile */}
          <Card>
            <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Profile</h2>
            <form action={updateAdminProfileAction} className="space-y-4">
              <input type="hidden" name="userId" value={user.id} />
              <Field label="Display name">
                <Input name="displayName" required maxLength={120} defaultValue={user.displayName} />
              </Field>
              <Field label="Email" hint="Email addresses cannot be changed.">
                <Input value={user.email} disabled />
              </Field>
              <SubmitButton>Save profile</SubmitButton>
            </form>
          </Card>

          {/* Roles */}
          <Card>
            <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Roles</h2>
            <form action={syncAdminRolesAction} className="space-y-4">
              <input type="hidden" name="userId" value={user.id} />
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(ROLE_DEFINITIONS).map(([key, def]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 border border-line bg-surface px-3 py-2 text-sm font-semibold text-fg hover:border-fg-faint"
                  >
                    <input
                      type="checkbox"
                      name="roles"
                      value={key}
                      defaultChecked={ownRoleKeys.has(key)}
                      className="size-4 accent-f1-red"
                    />
                    {def.name}
                  </label>
                ))}
              </div>
              <SubmitButton>Save roles</SubmitButton>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Access */}
          <Card>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Access</h2>
            <p className="mb-4 text-sm text-fg-muted">
              Status:{" "}
              <span
                className={`inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  user.isActive ? "bg-emerald-600 text-white" : "bg-line text-white"
                }`}
              >
                {user.isActive ? "Active" : "Inactive"}
              </span>{" "}
              · Failed logins: <span className="font-bold">{user.failedLogins}</span>
              {locked && (
                <span className="ml-2 inline-block bg-f1-red px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  Locked
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {user.isActive ? (
                <form action={toggleAdminActiveAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <ConfirmSubmit message={`Deactivate ${user.displayName}? They will no longer be able to sign in.`}>
                    Deactivate
                  </ConfirmSubmit>
                </form>
              ) : (
                <form action={toggleAdminActiveAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <SubmitButton variant="secondary">Activate</SubmitButton>
                </form>
              )}
              {user.failedLogins > 0 && (
                <form action={unlockAdminAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <SubmitButton variant="secondary">Unlock (reset failed logins)</SubmitButton>
                </form>
              )}
            </div>
            {isSelf && (
              <p className="mt-3 text-xs text-fg-faint">You cannot deactivate your own account.</p>
            )}
          </Card>

          {/* Reset password */}
          <Card>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Reset password</h2>
            <p className="mb-4 text-sm text-fg-muted">
              Sets a new password and signs the user out of all sessions.
            </p>
            <form action={resetAdminPasswordAction} className="space-y-4">
              <input type="hidden" name="userId" value={user.id} />
              <Field label="New password" hint="Minimum 10 characters.">
                <Input name="password" type="password" required minLength={10} autoComplete="new-password" />
              </Field>
              <SubmitButton variant="secondary">Reset password</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
