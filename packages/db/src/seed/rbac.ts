import { hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { Db } from "../client";
import { ALL_PERMISSIONS, PERMISSION_DESCRIPTIONS, ROLE_DEFINITIONS } from "../permissions";
import { adminUserRoles, adminUsers, permissions, rolePermissions, roles } from "../schema";

export async function seedRbac(db: Db) {
  console.log("Seeding RBAC…");

  await db
    .insert(permissions)
    .values(ALL_PERMISSIONS.map((key) => ({ key, description: PERMISSION_DESCRIPTIONS[key] })))
    .onConflictDoNothing();

  await db
    .insert(roles)
    .values(Object.entries(ROLE_DEFINITIONS).map(([key, def]) => ({ key, name: def.name })))
    .onConflictDoNothing();

  const permRows = await db.select().from(permissions);
  const roleRows = await db.select().from(roles);
  const permId = new Map(permRows.map((p) => [p.key, p.id]));
  const roleId = new Map(roleRows.map((r) => [r.key, r.id]));

  const rpValues = Object.entries(ROLE_DEFINITIONS).flatMap(([key, def]) =>
    def.permissions.map((p) => ({ roleId: roleId.get(key)!, permissionId: permId.get(p)! })),
  );
  await db.insert(rolePermissions).values(rpValues).onConflictDoNothing();

  // Super admin account
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  let userId = existing[0]?.id;
  if (!userId) {
    const [created] = await db
      .insert(adminUsers)
      .values({ email, passwordHash: hashSync(password, 12), displayName: "Super Admin" })
      .returning();
    userId = created.id;
    console.log(`  created super admin ${email}`);
  } else {
    console.log(`  super admin ${email} already exists — password left untouched`);
  }
  await db
    .insert(adminUserRoles)
    .values({ adminUserId: userId, roleId: roleId.get("super_admin")! })
    .onConflictDoNothing();
}
