import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { NotificationsToggle } from "@/components/notifications-toggle";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await requireAdmin();

  return (
    <>
      <PageHeader title="Account" sub="Your profile, devices and notifications." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-fg">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-fg-faint">Name</dt>
              <dd className="mt-0.5 text-fg">{session.user.displayName}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-fg-faint">Email</dt>
              <dd className="mt-0.5 break-all text-fg">{session.user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-fg-faint">Roles</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {session.roles.length ? (
                  session.roles.map((role) => (
                    <span
                      key={role}
                      className="border border-line px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-fg-muted"
                    >
                      {role.replace(/_/g, " ")}
                    </span>
                  ))
                ) : (
                  <span className="text-fg-faint">No roles assigned</span>
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-line pt-3 text-xs text-fg-faint">
            Editing your own name, email and password is coming next — for now a Super Admin
            changes these under Admin Users.
          </p>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-sm font-bold uppercase tracking-wide text-fg">
              Notifications on this device
            </h2>
            <p className="mt-1 mb-4 text-xs text-fg-muted">
              Announcements are delivered per device. Enable this on each phone or computer where
              you want alerts.
            </p>
            <NotificationsToggle />
          </Card>

          <InstallPrompt />
        </div>
      </div>
    </>
  );
}
