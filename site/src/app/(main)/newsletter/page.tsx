import type { Metadata } from "next";
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

  return (
    <AuthCard
      title="The race week briefing"
      subtitle="The biggest stories, results and talking points — straight to your inbox, once per race week."
    >
      <NewsletterForm defaultEmail={session?.fan.email ?? null} />
    </AuthCard>
  );
}
