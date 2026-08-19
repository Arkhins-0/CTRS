"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import { z } from "zod";
import { db, fans } from "@ctr/db";
import { createFanSession } from "@/lib/fan-auth";

export type LoginState = { error: string | null };

const loginSchema = z.object({
  email: z
    .string({ required_error: "Please enter your email address." })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
  password: z
    .string({ required_error: "Please enter your password." })
    .min(1, "Please enter your password."),
});

export async function loginFan(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const { email, password } = parsed.data;

  const [fan] = await db.select().from(fans).where(eq(fans.email, email));
  if (!fan || !compareSync(password, fan.passwordHash)) {
    return { error: "Incorrect email or password." };
  }
  if (fan.deactivatedAt) {
    return { error: "This account has been deactivated." };
  }

  await createFanSession(fan.id);
  redirect("/account");
}
