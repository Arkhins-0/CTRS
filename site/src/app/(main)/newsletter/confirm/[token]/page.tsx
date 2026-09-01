import { randomBytes } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { CheckCircle2, XCircle } from "lucide-react";
import { db, newsletterSubscribers } from "@ctr/db";
import { AuthCard } from "@/components/fanzone/auth-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm subscription",
  description: "Confirm your CTR newsletter subscription.",
};

export default async function ConfirmSubscriptionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let confirmedEmail: string | null = null;
  if (token && token.length >= 16 && token.length <= 64) {
    const [subscriber] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.confirmToken, token));
    if (subscriber) {
      await db
        .update(newsletterSubscribers)
        .set({
          status: "confirmed",
          confirmedAt: new Date(),
          confirmToken: null,
          // Every confirmed subscriber needs a working one-click unsubscribe
          // link before the first issue can reach them; mint one now rather
          // than leaving it to the sender to notice it's missing.
          unsubscribeToken: subscriber.unsubscribeToken ?? randomBytes(24).toString("hex"),
        })
        .where(eq(newsletterSubscribers.id, subscriber.id));
      confirmedEmail = subscriber.email;
    }
  }

  if (!confirmedEmail) {
    return (
      <AuthCard
        title="Link invalid"
        subtitle="This confirmation link is invalid or has expired."
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <XCircle size={28} aria-hidden className="shrink-0 text-negative" />
            <p className="body-s text-text-3">
              The link may have been used already, or the subscription was cancelled.
            </p>
          </div>
          <Link href="/newsletter" className="btn btn-md btn-brand">
            Subscribe again
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Subscription confirmed"
      subtitle="You're on the grid — see you on race week."
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={28} aria-hidden className="shrink-0 text-positive" />
          <p className="body-s text-text-3">
            <strong className="font-bold text-text-5">{confirmedEmail}</strong> will now receive
            the race week briefing.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn btn-md btn-brand">
            Back to the homepage
          </Link>
          <Link href="/account" className="btn btn-md btn-stroke">
            My account
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}
