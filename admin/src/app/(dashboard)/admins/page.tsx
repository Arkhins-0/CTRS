import Link from "next/link";
import { format } from "date-fns";
import { adminUsers, db, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, LinkButton, PageHeader, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminsIndex() {
  await requirePermission(PERMISSIONS.ADMINS_MANAGE);

  const users = await db.query.adminUsers.findMany({
    with: { userRoles: { with: { role: true } } },
    orderBy: (u, { asc }) => [asc(u.displayName)],
  });

  return (
    <>
      <PageHeader
        title="Admins"
        sub="CMS users, their roles and account status."
        actions={<LinkButton href="/admins/new">New admin</LinkButton>}
      />

      {users.length ? (
        <Table
          head={
            <>
              <th>Name</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Active</th>
              <th>Failed logins</th>
              <th>Last login</th>
            </>
          }
        >
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <Link href={`/admins/${u.id}`} className="font-bold hover:text-f1-red">
                  {u.displayName}
                </Link>
              </td>
              <td className="text-fg-muted">{u.email}</td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {u.userRoles.length ? (
                    u.userRoles.map((ur) => (
                      <span
                        key={ur.roleId}
                        className="inline-block bg-panel px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
                      >
                        {ur.role.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-fg-faint">—</span>
                  )}
                </div>
              </td>
              <td>
                <span
                  className={`inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                    u.isActive ? "bg-emerald-600 text-white" : "bg-line text-white"
                  }`}
                >
                  {u.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td>
                {u.failedLogins}
                {u.failedLogins >= 10 && (
                  <span className="ml-2 inline-block bg-f1-red px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    Locked
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap text-fg-muted">
                {u.lastLoginAt ? format(u.lastLoginAt, "d MMM yyyy HH:mm") : "never"}
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title="No admin users" hint="Create the first admin account." />
      )}
    </>
  );
}
