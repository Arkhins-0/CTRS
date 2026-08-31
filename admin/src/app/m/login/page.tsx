import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { getMemberSession } from "@/lib/member-auth";
import { MemberLoginForm } from "./login-form";

export const metadata = { title: "Member sign in" };

const NOTICES: Record<string, string> = {
  joined: "Account activated. Sign in to get started.",
  "password-reset": "Password updated. Sign in with your new password.",
};

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; status?: string }>;
}) {
  if (await getMemberSession()) redirect("/m");
  const { next, status } = await searchParams;
  const notice = status ? NOTICES[status] : undefined;

  return (
    <AuthCard title="Member sign in">
      {notice ? (
        <p
          role="status"
          className="mt-4 border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300"
        >
          {notice}
        </p>
      ) : null}
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        For team crew, drivers and officials. Accounts are created by invitation from your team
        admin.
      </p>
      <MemberLoginForm next={next ?? "/m"} />
    </AuthCard>
  );
}
