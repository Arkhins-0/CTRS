import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { logoutAction } from "../login/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-carbon">
        <Link href="/" className="flex items-center gap-2 border-b border-carbon-700 px-5 py-4">
          <span className="chamfer-tr bg-f1-red px-2 py-0.5 text-sm font-black uppercase italic text-white">
            CTR
          </span>
          <span className="text-sm font-black uppercase tracking-wider text-white">Sports CMS</span>
        </Link>
        <Sidebar permissions={[...session.permissions]} />
        <div className="border-t border-carbon-700 p-4">
          <p className="truncate text-xs font-bold text-white">{session.user.displayName}</p>
          <p className="truncate text-[11px] text-f1-grey-light">{session.user.email}</p>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-f1-grey-light transition-colors hover:text-f1-red"
            >
              <LogOut size={12} /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="ml-60 min-h-screen flex-1 bg-off-white px-8 py-7">{children}</main>
    </div>
  );
}
