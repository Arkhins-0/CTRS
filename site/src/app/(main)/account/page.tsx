import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Bookmark, ChevronRight, Heart, LogOut, Mail, Trophy } from "lucide-react";
import { db, newsletterSubscribers } from "@ctr/db";
import { CountryFlag } from "@ctr/ui";
import { requireFan } from "@/lib/fan-auth";
import { AccountNav } from "@/components/fanzone/account-nav";
import { Chip } from "@/components/fanzone/chip";
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
    <main className="bg-surface-3 pb-16">
      <AccountNav active="/account" />

      {/* greeting band */}
      <div className="f1-inner pt-8">
        <p className="display-s font-medium uppercase text-brand">Fan zone</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <h1 className="display-xl lg:display-2xl font-black uppercase text-text-5">
            Hello, {fan.displayName} <CountryFlag code={fan.countryCode} />
          </h1>
          <form action={signOut}>
            <button type="submit" className="btn btn-sm btn-stroke">
              <LogOut size={14} aria-hidden /> Sign out
            </button>
          </form>
        </div>
        <p className="body-xs mt-2 font-semibold text-text-3">{fan.email}</p>
      </div>

      <div className="f1-inner pt-8">
        {/* quick links */}
        <div className="grid gap-4 sm:grid-cols-3">
          {CARDS.map(({ href, title, description, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex h-full flex-col rounded-md bg-surface-1 p-6 transition-colors hover:bg-surface-2"
            >
              <Icon size={24} aria-hidden className="text-brand" />
              <h2 className="display-m mt-4 font-medium uppercase text-text-5">{title}</h2>
              <p className="body-xs mt-1.5 text-text-3">{description}</p>
              <span className="body-xs mt-auto flex items-center justify-between pt-6 font-bold uppercase text-text-3 transition-colors group-hover:text-text-5">
                Open
                <ChevronRight size={20} aria-hidden className="text-text-5" />
              </span>
            </Link>
          ))}
        </div>

        {/* profile */}
        <h2 className="display-l mt-12 font-black uppercase text-text-5">Profile</h2>
        <div className="mt-4 max-w-xl rounded-md bg-surface-1 p-6">
          <ProfileForm
            defaultDisplayName={fan.displayName}
            defaultCountryCode={fan.countryCode}
          />
        </div>

        {/* newsletter */}
        <h2 className="display-l mt-12 font-black uppercase text-text-5">Newsletter</h2>
        <div className="mt-4 max-w-xl rounded-md bg-surface-1 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Mail size={20} aria-hidden className="shrink-0 text-brand" />
              <div>
                <p className="display-m font-medium uppercase text-text-5">
                  Race week newsletter
                </p>
                <p className="body-xs mt-0.5 text-text-3">{fan.email}</p>
              </div>
            </div>
            {subStatus === "confirmed" ? (
              <Chip tone="green">Confirmed</Chip>
            ) : subStatus === "pending" ? (
              <Chip tone="amber">Pending confirmation</Chip>
            ) : subStatus === "unsubscribed" ? (
              <Chip tone="faint">Unsubscribed</Chip>
            ) : (
              <Chip tone="outline">Not subscribed</Chip>
            )}
          </div>

          {subStatus === "pending" && subscription?.confirmToken ? (
            <div className="mt-4">
              <DevNote confirmHref={`/newsletter/confirm/${subscription.confirmToken}`} />
            </div>
          ) : null}

          <div className="mt-6">
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
        </div>
      </div>
    </main>
  );
}
