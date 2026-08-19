"use server";

import { compareSync } from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminUsers, db } from "@ctr/db";
import { writeAudit } from "@/lib/audit";
import { createSession, destroySession } from "@/lib/auth";

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  if (!email || !password) return { error: "Email and password are required." };

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  if (!user || !user.isActive) return { error: "Invalid credentials." };
  if (user.failedLogins >= 10) {
    return { error: "Account locked after too many failed attempts. Ask a Super Admin to unlock it." };
  }

  if (!compareSync(password, user.passwordHash)) {
    await db
      .update(adminUsers)
      .set({ failedLogins: sql`${adminUsers.failedLogins} + 1` })
      .where(eq(adminUsers.id, user.id));
    return { error: "Invalid credentials." };
  }

  await db
    .update(adminUsers)
    .set({ failedLogins: 0, lastLoginAt: new Date() })
    .where(eq(adminUsers.id, user.id));

  const h = await headers();
  await createSession(
    user.id,
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    h.get("user-agent") ?? undefined,
  );
  await writeAudit({ actorId: user.id, action: "auth.login", entityType: "admin_user", entityId: user.id });

  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
