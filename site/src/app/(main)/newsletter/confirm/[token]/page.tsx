import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { CheckCircle2, XCircle } from "lucide-react";
import { db, newsletterSubscribers } from "@ctr/db";
import { AuthCard } from "@/components/fanzone/auth-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm subscription",
  description: "Confirm your CTR Sports newsletter subscription.",
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
        .set({ status: "confirmed", confirmedAt: new Date(), confirmToken: null })
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
        <div className="space-y-5">
          <div className="flex items-center gap-3 text-f1-grey">
            <XCircle size={28} className="shrink-0 text-f1-red" />
            <p className="text-sm">
              The link may have been used already, or the subscription was cancelled.
            </p>
          </div>
          <Link
            href="/newsletter"
            className="chamfer-tr inline-block bg-f1-red px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-f1-red-dark"
          >
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
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={28} className="shrink-0 text-emerald-600" />
          <p className="text-sm text-carbon">
            <strong>{confirmedEmail}</strong> will now receive the race week briefing.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="chamfer-tr inline-block bg-f1-red px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-f1-red-dark"
          >
            Back to the homepage
          </Link>
          <Link
            href="/account"
            className="chamfer-tr inline-block border border-warm-grey bg-white px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-f1-grey transition-colors hover:border-f1-red hover:text-f1-red"
          >
            My account
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}
