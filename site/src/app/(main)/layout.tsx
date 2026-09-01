import { cookies } from "next/headers";
import { CookieConsent } from "@/components/consent/cookie-consent";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CONSENT_COOKIE, parseConsent } from "@/lib/consent";

/**
 * Public site shell. The consent banner lives here and nowhere else — the
 * admin console and the member area are a different Next app, both behind a
 * sign-in, both using one strictly-necessary session cookie and embedding
 * nothing third-party, so neither needs to ask.
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const consent = parseConsent((await cookies()).get(CONSENT_COOKIE)?.value);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div id="maincontent" className="relative z-0 flex-1">
        {children}
      </div>
      <SiteFooter />
      <CookieConsent initial={consent} />
    </div>
  );
}
