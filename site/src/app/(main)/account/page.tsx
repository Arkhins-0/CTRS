import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Bookmark, Heart, LogOut, Mail, Trophy } from "lucide-react";
import { db, newsletterSubscribers } from "@ctr/db";
import { Badge, ChamferCard, CountryFlag, SectionHeading } from "@ctr/ui";
import { requireFan } from "@/lib/fan-auth";
import { DevNote } from "@/components/fanzone/dev-note";
import { SubmitButton } from "@/components/fanzone/submit-button";
import { signOut, subscribeNewsletter, unsubscribeNewsletter } from "./actions";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account",
  description: "Your CTR Sports fan zone dashboard.",
};

const CARDS = [
  {
    href: "/account/saved",
    title: "Saved articles",
    description: "Stories you bookmarked to read later.",
    Icon: Bookmark,
  },
  {
    href: "/account/favourites",
    title: "Favourites",
    description: "Your favourite driver and team.",
    Icon: Heart,
  },
  {
    href: "/account/predictions",
    title: "Predictions",
    description: "Your poll votes and how your picks fared.",
    Icon: Trophy,
  },
] as const;

export default async function AccountPage() {
  const { fan } = await requireFan();

  const [subscription] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, fan.email));
  const subStatus = subscription?.status ?? "none";

  return (
    <>
      {/* greeting band */}
      <div className="border-b-4 border-f1-red bg-carbon-fibre">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-f1-red">Fan zone</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
              Hello, {fan.displayName} <CountryFlag code={fan.countryCode} />
            </h1>
            <form action={signOut}>
              <button
                type="submit"
                className="chamfer-tr inline-flex items-center gap-2 border border-carbon-600 bg-carbon-800 px-4 py-2 text-xs font-bold uppercase tracking-wide text-warm-grey transition-colors hover:border-f1-red hover:text-white"
              >
                <LogOut size={14} /> Sign out
              </button>
            </form>
          </div>
          <p className="mt-1 text-sm font-semibold text-f1-grey-light">{fan.email}</p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* quick links */}
        <div className="grid gap-4 sm:grid-cols-3">
          {CARDS.map(({ href, title, description, Icon }) => (
            <Link key={href} href={href} className="group">
              <ChamferCard className="h-full border border-warm-grey bg-white p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-f1-red">
                <Icon size={22} className="text-f1-red" />
                <h2 className="mt-3 text-base font-black uppercase tracking-tight text-carbon transition-colors group-hover:text-f1-red">
                  {title}
                </h2>
                <p className="mt-1 text-sm text-f1-grey">{description}</p>
              </ChamferCard>
            </Link>
          ))}
        </div>

        {/* profile */}
        <SectionHeading className="mt-12">Profile</SectionHeading>
        <ChamferCard className="mt-6 max-w-xl border border-warm-grey bg-white p-6">
          <ProfileForm
            defaultDisplayName={fan.displayName}
            defaultCountryCode={fan.countryCode}
          />
        </ChamferCard>

        {/* newsletter */}
        <SectionHeading className="mt-12">Newsletter</SectionHeading>
        <ChamferCard className="mt-6 max-w-xl border border-warm-grey bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Mail size={20} className="shrink-0 text-f1-red" />
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-carbon">
                  Race week newsletter
                </p>
                <p className="text-sm text-f1-grey">{fan.email}</p>
              </div>
            </div>
            {subStatus === "confirmed" ? (
              <Badge tone="green">Confirmed</Badge>
            ) : subStatus === "pending" ? (
              <Badge tone="amber">Pending confirmation</Badge>
            ) : subStatus === "unsubscribed" ? (
              <Badge tone="grey">Unsubscribed</Badge>
            ) : (
              <Badge tone="outline">Not subscribed</Badge>
            )}
          </div>

          {subStatus === "pending" && subscription?.confirmToken ? (
            <div className="mt-4">
              <DevNote confirmHref={`/newsletter/confirm/${subscription.confirmToken}`} />
            </div>
          ) : null}

          <div className="mt-5">
            {subStatus === "confirmed" || subStatus === "pending" ? (
              <form action={unsubscribeNewsletter}>
                <SubmitButton tone="ghost" label="Unsubscribe" pendingLabel="Working…" />
              </form>
            ) : (
              <form action={subscribeNewsletter}>
                <SubmitButton label="Subscribe" pendingLabel="Working…" />
              </form>
            )}
          </div>
        </ChamferCard>
      </main>
    </>
  );
}
