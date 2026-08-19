"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import { z } from "zod";
import { db, fans } from "@ctr/db";
import { createFanSession } from "@/lib/fan-auth";
import { upsertPendingSubscription } from "@/components/fanzone/newsletter-db";

export type RegisterState = { error: string | null };

const registerSchema = z.object({
  displayName: z
    .string({ required_error: "Please enter a display name." })
    .trim()
    .min(2, "Your display name must be at least 2 characters.")
    .max(120, "Your display name must be 120 characters or fewer."),
  email: z
    .string({ required_error: "Please enter your email address." })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address.")
    .max(255, "Email addresses can be at most 255 characters."),
  password: z
    .string({ required_error: "Please choose a password." })
    .min(8, "Your password must be at least 8 characters.")
    .max(72, "Your password must be 72 characters or fewer."),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Please choose a valid country.")
    .optional(),
  newsletter: z.boolean(),
});

export async function registerFan(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    countryCode: (formData.get("countryCode") as string | null) || undefined,
    newsletter: formData.get("newsletter") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const data = parsed.data;

  const [existing] = await db
    .select({ id: fans.id })
    .from(fans)
    .where(eq(fans.email, data.email));
  if (existing) {
    return {
      error: "An account with that email already exists — try signing in instead.",
    };
  }

  const [fan] = await db
    .insert(fans)
    .values({
      email: data.email,
      passwordHash: hashSync(data.password, 12),
      displayName: data.displayName,
      countryCode: data.countryCode ?? null,
    })
    .returning({ id: fans.id });

  await createFanSession(fan.id);

  if (data.newsletter) {
    await upsertPendingSubscription(data.email, fan.id, "register");
  }

  redirect("/account");
}
