import { LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/shell/admin-shell";
import { logoutAction } from "../login/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  const signOut = (
    <form action={logoutAction}>
      <button
        type="submit"
        className="flex min-h-9 items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-fg-faint transition-colors hover:text-f1-red"
      >
        <LogOut size={12} /> Sign out
      </button>
    </form>
  );

  return (
    <AdminShell
      permissions={[...session.permissions]}
      user={{ displayName: session.user.displayName, email: session.user.email }}
      signOut={signOut}
    >
      {children}
    </AdminShell>
  );
}
