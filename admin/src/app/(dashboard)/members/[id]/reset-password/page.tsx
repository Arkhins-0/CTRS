import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, members, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/member-roles";
import { Card, Field, Input, LinkButton, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { resetMemberPasswordAction } from "../../actions";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  invalid: "Use at least 10 characters.",
};

export default async function ResetMemberPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  // Restricted to Super Admin — see the comment on resetMemberPasswordAction
  // for why this is gated on admins.manage rather than members.manage.
  await requirePermission(PERMISSIONS.ADMINS_MANAGE);
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();

  const member = await db.query.members.findFirst({
    where: eq(members.id, id),
    columns: { id: true, displayName: true, email: true, role: true },
    with: { team: { columns: { name: true } } },
  });
  if (!member) notFound();

  return (
    <>
      <PageHeader
        title={`Reset password — ${member.displayName}`}
        sub={`${member.email} · ${ROLE_LABELS[member.role]}${member.team ? ` · ${member.team.name}` : ""}`}
        actions={<LinkButton href="/members" variant="ghost">← All members</LinkButton>}
      />

      <Card className="max-w-md">
        <p className="mb-4 text-sm text-fg-muted">
          Sets this member&apos;s password directly and signs them out of every device. They are
          notified by email that it changed.
        </p>

        {error && MESSAGES[error] ? (
          <p className="mb-4 border border-f1-red/40 bg-f1-red/10 px-3 py-2 text-xs font-bold text-red-700">
            {MESSAGES[error]}
          </p>
        ) : null}

        <form action={resetMemberPasswordAction} className="space-y-4">
          <input type="hidden" name="memberId" value={member.id} />
          <Field label="New password" hint="At least 10 characters.">
            <Input name="newPassword" type="password" minLength={10} required autoFocus />
          </Field>
          <SubmitButton variant="danger">Reset password</SubmitButton>
        </form>
      </Card>
    </>
  );
}
