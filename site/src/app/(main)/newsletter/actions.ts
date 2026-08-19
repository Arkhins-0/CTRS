"use server";

import { z } from "zod";
import { getFanSession } from "@/lib/fan-auth";
import { upsertPendingSubscription } from "@/components/fanzone/newsletter-db";

export type NewsletterState = {
  error: string | null;
  done: boolean;
  email: string | null;
  status: "pending" | "confirmed" | null;
  /** confirm token surfaced on-screen — no real email sending exists */
  token: string | null;
};

const subscribeSchema = z.object({
  email: z
    .string({ required_error: "Please enter your email address." })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address.")
    .max(255, "Email addresses can be at most 255 characters."),
});

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = subscribeSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      done: false,
      email: null,
      status: null,
      token: null,
    };
  }
  const { email } = parsed.data;

  // link the subscription to the signed-in fan when it's their own address
  const session = await getFanSession();
  const fanId = session && session.fan.email === email ? session.fan.id : null;

  const result = await upsertPendingSubscription(email, fanId, "newsletter");

  return { error: null, done: true, email, status: result.status, token: result.token };
}
