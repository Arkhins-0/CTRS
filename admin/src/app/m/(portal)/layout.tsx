import { LogOut } from "lucide-react";
import { requireMember } from "@/lib/member-auth";
import { MemberShell } from "@/components/shell/member-shell";
import { memberLogoutAction } from "../login/actions";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await requireMember();

  const signOut = (
    <form action={memberLogoutAction}>
      <button
        type="submit"
        aria-label="Sign out"
        className="grid size-11 place-items-center border border-line text-fg-faint transition-colors hover:text-f1-red"
      >
        <LogOut size={16} />
      </button>
    </form>
  );

  return (
    <MemberShell
      role={session.member.role}
      displayName={session.member.displayName}
      teamName={session.team?.name ?? null}
      signOut={signOut}
    >
      {children}
    </MemberShell>
  );
}
