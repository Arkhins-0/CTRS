import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { BellRing, MailX, XCircle } from "lucide-react";
import { db, newsletterSubscribers } from "@ctr/db";
import { AuthCard } from "@/components/fanzone/auth-card";
import { resubscribeAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Manage your CTR Sports newsletter subscription.",
};

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ resubscribed?: string }>;
}) {
  const { token } = await params;
  const { resubscribed } = await searchParams;

  const [subscriber] = await db
    .select({ id: newsletterSubscribers.id, email: newsletterSubscribers.email, status: newsletterSubscribers.status })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.unsubscribeToken, token));

  if (!subscriber) {
    return (
      <AuthCard title="Link invalid" subtitle="This unsubscribe link is invalid or has expired.">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <XCircle size={28} aria-hidden className="shrink-0 text-negative" />
            <p className="body-s text-text-3">
              If you no longer want race-week emails, manage your subscription from your account
              instead.
            </p>
          </div>
          <Link href="/account" className="btn btn-md btn-brand">
            My account
          </Link>
        </div>
      </AuthCard>
    );
  }

  /*
   * One click, no manual confirmation step: visiting this link IS the
   * unsubscribe action. Skipped only when we've just landed here from
   * resubscribeAction's own redirect — otherwise showing the "you're back
   * in" confirmation would immediately re-unsubscribe the person reading it.
   */
  if (resubscribed !== "1" && subscriber.status !== "unsubscribed") {
    await db
      .update(newsletterSubscribers)
      .set({ status: "unsubscribed" })
      .where(eq(newsletterSubscribers.id, subscriber.id));
  }

  if (resubscribed === "1") {
    return (
      <AuthCard title="You're back in" subtitle="Race-week emails will resume for this address.">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <BellRing size={28} aria-hidden className="shrink-0 text-positive" />
            <p className="body-s text-text-3">
              <strong className="font-bold text-text-5">{subscriber.email}</strong> is subscribed
              again — see you on race week.
            </p>
          </div>
          <Link href="/" className="btn btn-md btn-brand">
            Back to the homepage
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Unsubscribed" subtitle="You won't get any more race-week emails.">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <MailX size={28} aria-hidden className="shrink-0 text-text-3" />
          <p className="body-s text-text-3">
            <strong className="font-bold text-text-5">{subscriber.email}</strong> has been removed
            from The Pit Wall. This took effect immediately — nothing else to do.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form action={resubscribeAction}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="btn btn-md btn-brand">
              Resubscribe
            </button>
          </form>
          <Link href="/" className="btn btn-md btn-stroke">
            Back to the homepage
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}
