"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, members } from "@ctr/db";
import { createMemberSession, destroyMemberSession } from "@/lib/member-auth";
import { checkRateLimit } from "@/lib/rate-limit";

const LOCKOUT_AT = 10;

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type LoginState = { error: string } | undefined;

/**
 * Member sign-in.
 *
 * Every failure returns the SAME message. Distinguishing "no such account"
 * from "wrong password" would let anyone test whether an address is on a
 * team's roster, and roster membership is not public information.
 */
export async function memberLoginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const generic = { error: "Email or password is incorrect." };

  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return generic;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const byIp = await checkRateLimit(`mlogin:ip:${ip}`, 20, 15 * 60 * 1000);
  if (!byIp.allowed) return { error: "Too many attempts. Try again in a few minutes." };
  const byEmail = await checkRateLimit(`mlogin:email:${parsed.data.email}`, 10, 15 * 60 * 1000);
  if (!byEmail.allowed) return { error: "Too many attempts. Try again in a few minutes." };

  const member = await db.query.members.findFirst({
    where: eq(members.email, parsed.data.email),
    columns: {
      id: true,
      passwordHash: true,
      isActive: true,
      failedLogins: true,
    },
  });

  // Compare against a dummy hash when the account is absent so the response
  // time does not reveal whether the address exists.
  const hash = member?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = bcrypt.compareSync(parsed.data.password, hash);

  if (!member || !ok || !member.isActive) {
    if (member) {
      await db
        .update(members)
        .set({ failedLogins: sql`${members.failedLogins} + 1` })
        .where(eq(members.id, member.id));
    }
    return generic;
  }

  if (member.failedLogins >= LOCKOUT_AT) {
    return { error: "This account is locked. Ask your team admin to reset it." };
  }

  await db
    .update(members)
    .set({ failedLogins: 0, lastLoginAt: new Date() })
    .where(eq(members.id, member.id));

  await createMemberSession(member.id, ip, h.get("user-agent") ?? undefined);

  const next = String(formData.get("next") ?? "/m");
  // Only ever redirect within the member area — never to an attacker's URL,
  // and never into the CMS, which a member has no session for anyway.
  redirect(next.startsWith("/m") && !next.startsWith("//") ? next : "/m");
}

export async function memberLogoutAction() {
  await destroyMemberSession();
  redirect("/m/login");
}
