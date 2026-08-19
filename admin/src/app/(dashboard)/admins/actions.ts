"use server";

import { hashSync } from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  adminSessions,
  adminUserRoles,
  adminUsers,
  db,
  PERMISSIONS,
  ROLE_DEFINITIONS,
  roles,
} from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const str = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

const roleKeySchema = z
  .string()
  .refine((k): k is keyof typeof ROLE_DEFINITIONS => k in ROLE_DEFINITIONS, "Unknown role");

function getRoleKeys(formData: FormData) {
  return z.array(roleKeySchema).parse(formData.getAll("roles").map(String));
}

async function syncRoleRows(adminUserId: string, roleKeys: string[]) {
  await db.transaction(async (tx) => {
    await tx.delete(adminUserRoles).where(eq(adminUserRoles.adminUserId, adminUserId));
    if (roleKeys.length) {
      const roleRows = await tx.select().from(roles).where(inArray(roles.key, roleKeys));
      if (roleRows.length !== roleKeys.length) throw new Error("One or more roles are not seeded");
      await tx
        .insert(adminUserRoles)
        .values(roleRows.map((r) => ({ adminUserId, roleId: r.id })));
    }
  });
}

/* ── create ──────────────────────────────────────────────────────────────── */

const createSchema = z.object({
  displayName: z.string().min(1).max(120),
  email: z.string().email().max(255),
  password: z.string().min(10),
});

export async function createAdminAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.ADMINS_MANAGE);
  const data = createSchema.parse({
    displayName: str(formData, "displayName"),
    email: str(formData, "email").toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  const roleKeys = getRoleKeys(formData);

  const [row] = await db
    .insert(adminUsers)
    .values({
      displayName: data.displayName,
      email: data.email,
      passwordHash: hashSync(data.password, 12),
    })
    .returning();
  await syncRoleRows(row.id, roleKeys);

  await writeAudit({
    actorId: session.user.id,
    action: "admin.create",
    entityType: "admin_user",
    entityId: row.id,
    diff: { after: { displayName: data.displayName, email: data.email, roles: roleKeys } },
  });
  revalidatePath("/admins");
  redirect(`/admins/${row.id}`);
}

/* ── update profile ──────────────────────────────────────────────────────── */

export async function updateAdminProfileAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.ADMINS_MANAGE);
  const data = z
    .object({ userId: z.string().uuid(), displayName: z.string().min(1).max(120) })
    .parse({ userId: str(formData, "userId"), displayName: str(formData, "displayName") });

  const [before] = await db.select().from(adminUsers).where(eq(adminUsers.id, data.userId));
  if (!before) throw new Error("Admin not found");

  await db
    .update(adminUsers)
    .set({ displayName: data.displayName })
    .where(eq(adminUsers.id, data.userId));

  await writeAudit({
    actorId: session.user.id,
    action: "admin.update",
    entityType: "admin_user",
    entityId: data.userId,
    diff: { before: { displayName: before.displayName }, after: { displayName: data.displayName } },
  });
  revalidatePath("/admins");
  revalidatePath(`/admins/${data.userId}`);
}

/* ── role matrix ─────────────────────────────────────────────────────────── */

export async function syncAdminRolesAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.ADMINS_MANAGE);
  const { userId } = z.object({ userId: z.string().uuid() }).parse({ userId: str(formData, "userId") });
  const roleKeys = getRoleKeys(formData);

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));
  if (!user) throw new Error("Admin not found");

  const beforeRows = await db
    .select({ key: roles.key })
    .from(adminUserRoles)
    .innerJoin(roles, eq(roles.id, adminUserRoles.roleId))
    .where(eq(adminUserRoles.adminUserId, userId));

  await syncRoleRows(userId, roleKeys);

  await writeAudit({
    actorId: session.user.id,
    action: "admin.roles",
    entityType: "admin_user",
    entityId: userId,
    diff: { before: { roles: beforeRows.map((r) => r.key).sort() }, after: { roles: [...roleKeys].sort() } },
  });
  revalidatePath("/admins");
  revalidatePath(`/admins/${userId}`);
}

/* ── activate / deactivate ───────────────────────────────────────────────── */

export async function toggleAdminActiveAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.ADMINS_MANAGE);
  const { userId } = z.object({ userId: z.string().uuid() }).parse({ userId: str(formData, "userId") });

  const [before] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));
  if (!before) throw new Error("Admin not found");

  // Never let an admin lock themselves out.
  if (before.isActive && userId === session.user.id) {
    redirect(`/admins/${userId}?error=self`);
  }

  await db.update(adminUsers).set({ isActive: !before.isActive }).where(eq(adminUsers.id, userId));

  await writeAudit({
    actorId: session.user.id,
    action: before.isActive ? "admin.deactivate" : "admin.activate",
    entityType: "admin_user",
    entityId: userId,
    diff: { before: { isActive: before.isActive }, after: { isActive: !before.isActive } },
  });
  revalidatePath("/admins");
  revalidatePath(`/admins/${userId}`);
}

/* ── unlock ──────────────────────────────────────────────────────────────── */

export async function unlockAdminAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.ADMINS_MANAGE);
  const { userId } = z.object({ userId: z.string().uuid() }).parse({ userId: str(formData, "userId") });

  const [before] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));
  if (!before) throw new Error("Admin not found");

  await db.update(adminUsers).set({ failedLogins: 0 }).where(eq(adminUsers.id, userId));

  await writeAudit({
    actorId: session.user.id,
    action: "admin.unlock",
    entityType: "admin_user",
    entityId: userId,
    diff: { before: { failedLogins: before.failedLogins }, after: { failedLogins: 0 } },
  });
  revalidatePath("/admins");
  revalidatePath(`/admins/${userId}`);
}

/* ── reset password ──────────────────────────────────────────────────────── */

export async function resetAdminPasswordAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.ADMINS_MANAGE);
  const data = z
    .object({ userId: z.string().uuid(), password: z.string().min(10) })
    .parse({ userId: str(formData, "userId"), password: String(formData.get("password") ?? "") });

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, data.userId));
  if (!user) throw new Error("Admin not found");

  await db.transaction(async (tx) => {
    await tx
      .update(adminUsers)
      .set({ passwordHash: hashSync(data.password, 12), failedLogins: 0 })
      .where(eq(adminUsers.id, data.userId));
    // force re-login everywhere with the new password
    await tx.delete(adminSessions).where(eq(adminSessions.adminUserId, data.userId));
  });

  await writeAudit({
    actorId: session.user.id,
    action: "admin.password-reset",
    entityType: "admin_user",
    entityId: data.userId,
  });
  revalidatePath(`/admins/${data.userId}`);
}
