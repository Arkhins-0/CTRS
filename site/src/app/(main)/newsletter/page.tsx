import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, newsletterSubscribers } from "@ctr/db";
import { getFanSession } from "@/lib/fan-auth";
import { AuthCard } from "@/components/fanzone/auth-card";
import { NewsletterForm } from "./newsletter-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "The race week briefing — the biggest stories, straight to your inbox.",
};

export default async function NewsletterPage() {
  const session = await getFanSession();

  /*
   * A signed-in fan who is already on the list was still being shown the
   * sign-up form, with no hint that they were subscribed — so the only way
   * to find out was to submit it again. Look their status up and answer the
   * question instead.
   */
  const [subscription] = session
    ? await db
        .select({ status: newsletterSubscribers.status })
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, session.fan.email))
    : [];

  if (subscription?.status === "confirmed" || subscription?.status === "pending") {
    const pending = subscription.status === "pending";
    return (
      <AuthCard
        title={pending ? "Almost there" : "You're on the list"}
        subtitle={
          pending
            ? "We've sent a confirmation link to your inbox — open it and you're in."
            : "The race week briefing lands in your inbox once per race week."
        }
      >
        <p className="body-s text-text-3">{session!.fan.email}</p>
        <p className="body-s mt-4 text-text-3">
          You can unsubscribe any time from your{" "}
          <Link href="/account" className="font-bold text-text-5 underline">
            account
          </Link>
          , or with the link at the bottom of any issue.
        </p>
        <Link href="/account" className="btn btn-md btn-brand mt-6">
          Go to my account
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="The race week briefing"
      subtitle="The biggest stories, results and talking points — straight to your inbox, once per race week."
    >
      <NewsletterForm defaultEmail={session?.fan.email ?? null} />
    </AuthCard>
  );
}
