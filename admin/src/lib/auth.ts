import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import {
  adminSessions,
  adminUserRoles,
  adminUsers,
  db,
  permissions as permissionsTable,
  rolePermissions,
  roles,
  type Permission,
} from "@ctr/db";

const COOKIE = "ctr_admin_session";
const SESSION_MS = 30 * 24 * 3600 * 1000; // 30 days

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export type AdminSession = {
  user: { id: string; email: string; displayName: string };
  roles: string[];
  permissions: Set<string>;
};

export async function createSession(adminUserId: string, ip?: string, userAgent?: string) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(adminSessions).values({
    tokenHash: sha256(token),
    adminUserId,
    expiresAt: new Date(Date.now() + SESSION_MS),
    ip,
    userAgent,
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MS / 1000,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, sha256(token)));
  }
  store.delete(COOKIE);
}

/** Loads user + full permission set once per request (React cache). */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      displayName: adminUsers.displayName,
      roleKey: roles.key,
      permKey: permissionsTable.key,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .leftJoin(adminUserRoles, eq(adminUserRoles.adminUserId, adminUsers.id))
    .leftJoin(roles, eq(roles.id, adminUserRoles.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissionsTable, eq(permissionsTable.id, rolePermissions.permissionId))
    .where(
      and(
        eq(adminSessions.tokenHash, sha256(token)),
        gt(adminSessions.expiresAt, new Date()),
        eq(adminUsers.isActive, true),
      ),
    );

  if (!rows.length) return null;
  return {
    user: { id: rows[0].id, email: rows[0].email, displayName: rows[0].displayName },
    roles: [...new Set(rows.map((r) => r.roleKey).filter(Boolean))] as string[],
    permissions: new Set(rows.map((r) => r.permKey).filter(Boolean) as string[]),
  };
});

/** Redirects to /login when unauthenticated. Use in layouts/pages. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * The authoritative RBAC gate — call at the top of EVERY server action,
 * route handler and section layout.
 */
export async function requirePermission(perm: Permission): Promise<AdminSession> {
  const session = await requireAdmin();
  if (!session.permissions.has(perm)) redirect("/denied");
  return session;
}

/** Non-redirecting variant for route handlers: returns null when denied. */
export async function checkPermission(perm: Permission): Promise<AdminSession | null> {
  const session = await getAdminSession();
  if (!session || !session.permissions.has(perm)) return null;
  return session;
}
