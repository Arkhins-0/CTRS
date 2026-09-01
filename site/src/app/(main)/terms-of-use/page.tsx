import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, P, Term, Ul } from "@/components/legal/legal-page";

/* ── Terms of Use ──────────────────────────────────────────────────────────
   Governs use of the public championship website: accounts, acceptable use,
   fan-zone participation, intellectual property, disclaimers (including the
   provisional-results rule racing fans actually care about), liability and
   governing law. Companion document to the Privacy Policy. ────────────────── */

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The terms that govern use of the CTR–JK Tyre FMSCI Indian National Car Racing Championship website, fan accounts and fan-zone features.",
};

const CONTACT_EMAIL = "admin@ctrsports.in";

export default function TermsOfUsePage() {
  return (
    <LegalPage
      title="Terms of Use"
      effectiveDate="1 September 2026"
      intro={
        <>
          <P>
            These terms are an agreement between you and CTR Unified (&quot;CTR&quot;,
            &quot;we&quot;), organiser of the CTR–JK Tyre FMSCI Indian National Car Racing
            Championship, and they govern your use of this website and its fan features. By
            using the site you accept them; if you do not accept them, please do not use the
            site.
          </P>
          <P>
            How we handle personal data is covered separately in our{" "}
            <Link
              href="/privacy-policy"
              className="font-bold text-text-5 underline decoration-2 underline-offset-2"
            >
              Privacy Policy
            </Link>
            , which forms part of these terms.
          </P>
        </>
      }
      sections={[
        {
          id: "the-service",
          title: "What this site is",
          body: (
            <P>
              This website is the official home of the championship: news and video, the race
              schedule, results and standings, driver and team profiles, and a fan zone with
              accounts, polls, predictions, favourites and a newsletter. The site is provided
              free of charge for personal, non-commercial use. Some features require a fan
              account; nothing on the site requires payment.
            </P>
          ),
        },
        {
          id: "accounts",
          title: "Fan accounts",
          body: (
            <>
              <Ul>
                <Term term="Eligibility">
                  fan accounts are intended for users aged 13 and over. If you are under 18,
                  register only with the consent of a parent or guardian.
                </Term>
                <Term term="Accuracy">
                  register with an email address you control and keep your details current — we
                  use that address for security emails such as password resets.
                </Term>
                <Term term="Security">
                  you are responsible for keeping your password confidential and for activity
                  under your account. Tell us at {CONTACT_EMAIL} if you believe your account
                  has been compromised.
                </Term>
                <Term term="Display names">
                  choose a display name that is not offensive, misleading or impersonating
                  another person, driver, team or official. We may ask you to change one that
                  is.
                </Term>
              </Ul>
              <P>
                You can delete your account at any time from your account page. We may suspend
                or close accounts that break these terms (section 4).
              </P>
            </>
          ),
        },
        {
          id: "fan-zone",
          title: "Polls, predictions and RSVPs",
          body: (
            <>
              <P>
                Fan-zone features — polls, race predictions, favourites and race-weekend
                RSVPs — exist for entertainment and community. Unless a specific promotion says
                otherwise in its own published rules:
              </P>
              <Ul>
                <li>predictions and polls carry no prizes, winnings or monetary value;</li>
                <li>
                  nothing on this site is gambling, betting or a lottery, and no feature may be
                  used as one;
                </li>
                <li>
                  an RSVP is an expression of interest, not a ticket, reservation or right of
                  entry to any event.
                </li>
              </Ul>
              <P>
                Attendance at race weekends is governed by the venue's and the event
                organiser's own terms, tickets and safety rules.
              </P>
            </>
          ),
        },
        {
          id: "acceptable-use",
          title: "Acceptable use",
          body: (
            <>
              <P>When using the site you agree not to:</P>
              <Ul>
                <li>break any applicable law or infringe anyone's rights;</li>
                <li>
                  probe, disrupt or overload the site, attempt to access accounts or systems
                  you are not authorised to access, or circumvent security or rate limits;
                </li>
                <li>
                  scrape, harvest or bulk-download content or personal data, or use automated
                  tools to interact with fan-zone features (votes, predictions, RSVPs);
                </li>
                <li>
                  misrepresent an affiliation with CTR, the FMSCI, JK Tyre, or any team,
                  driver or partner;
                </li>
                <li>upload or transmit malware or interfere with other users' enjoyment of the site.</li>
              </Ul>
              <P>
                We may suspend or terminate access, remove content and cancel fan-zone entries
                that violate this section, and where the law requires it we may report abuse to
                the authorities.
              </P>
            </>
          ),
        },
        {
          id: "intellectual-property",
          title: "Intellectual property",
          body: (
            <>
              <P>
                The site and its content — text, photographs, video, graphics, logos, data
                compilations and software — are owned by CTR Unified or licensed to us, and are
                protected by copyright and trademark law. The CTR name, the CTR mark and the
                championship name are trademarks of CTR Unified; JK Tyre, FMSCI and partner
                marks belong to their respective owners.
              </P>
              <P>
                You may view, share links to, and make personal non-commercial use of the
                content. You may not republish, sell or commercially exploit content from the
                site — including systematic copies of results and standings data — without our
                prior written permission. Requests go to {CONTACT_EMAIL}.
              </P>
            </>
          ),
        },
        {
          id: "results",
          title: "Results and standings are provisional",
          body: (
            <P>
              Results, classifications and standings published on this site are provided for
              information. They may be provisional and can change following scrutineering,
              stewards' decisions, penalties or appeals. The official classification of any
              session is the one issued by the event's officials under the FMSCI's sporting
              regulations — where this site and an official document disagree, the official
              document prevails.
            </P>
          ),
        },
        {
          id: "third-party",
          title: "Third-party content and links",
          body: (
            <P>
              The site embeds videos hosted on YouTube (only after you consent — see the{" "}
              <Link
                href="/privacy-policy"
                className="font-bold text-text-5 underline decoration-2 underline-offset-2"
              >
                Privacy Policy
              </Link>
              ) and may link to partner, venue or ticketing websites. Those services have their
              own terms and policies, and we are not responsible for their content or conduct.
              A link is not an endorsement.
            </P>
          ),
        },
        {
          id: "communications",
          title: "Newsletter and notifications",
          body: (
            <P>
              The newsletter is double opt-in: you receive it only after confirming your
              address, and every issue contains an unsubscribe link that works immediately.
              Push notifications are opt-in per browser and can be disabled at any time in the
              site's notification settings or your browser. Service emails (verification,
              password resets, security notices) are sent as needed to operate your account.
            </P>
          ),
        },
        {
          id: "disclaimers",
          title: "Disclaimers",
          body: (
            <P>
              The site is provided &quot;as is&quot; and &quot;as available&quot;. While we
              work to keep information accurate and the site online — especially on race
              weekends — we do not guarantee uninterrupted availability, or that schedules,
              session times and other content are free of errors. Event dates and times can
              change at short notice; always check official event communications before
              travelling.
            </P>
          ),
        },
        {
          id: "liability",
          title: "Limitation of liability",
          body: (
            <>
              <P>
                To the maximum extent permitted by law, CTR Unified is not liable for indirect
                or consequential losses arising from use of this free website — including lost
                profits, lost data or wasted travel — nor for matters outside our reasonable
                control. Our total aggregate liability for any claim relating to the site is
                limited to ₹1,000.
              </P>
              <P>
                Nothing in these terms excludes or limits liability that cannot be excluded
                under Indian law, including liability for fraud.
              </P>
            </>
          ),
        },
        {
          id: "changes-termination",
          title: "Changes and termination",
          body: (
            <>
              <P>
                We may change, suspend or discontinue parts of the site at any time — features
                evolve over a season. We may update these terms as the site changes: the
                effective date above always states the current version, and significant changes
                will be announced on the site or by email to account holders before they take
                effect. Using the site after a change takes effect means the updated terms
                apply to you.
              </P>
              <P>
                You can stop using the site and delete your account at any time. Sections that
                by their nature should survive termination (intellectual property, disclaimers,
                liability, governing law) survive it.
              </P>
            </>
          ),
        },
        {
          id: "governing-law",
          title: "Governing law and jurisdiction",
          body: (
            <P>
              These terms are governed by the laws of India. Subject to any mandatory consumer
              protections, the courts at Chennai, Tamil Nadu have exclusive jurisdiction over
              disputes arising from these terms or your use of the site.
            </P>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          body: (
            <P>
              Questions about these terms go to{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-bold text-text-5 underline decoration-2 underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              or by post to CTR Unified, 29, Tilak Street, T. Nagar, Chennai, Tamil Nadu
              600017, India.
            </P>
          ),
        },
      ]}
    />
  );
}
