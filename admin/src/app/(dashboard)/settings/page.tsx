import { desc, eq } from "drizzle-orm";
import { championships, championshipSeasons, db, PERMISSIONS, siteSettings } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import {
  homeChampionshipSlug,
  updateBroadcastBannerAction,
  updateCurrentSeasonAction,
  updateFooterLinksAction,
  updateNavLinksAction,
  updateSocialLinksAction,
  updateThemeAction,
} from "./actions";

export const dynamic = "force-dynamic";

type LinkItem = { label?: string; href?: string };
type SocialItem = { platform?: string; url?: string };
type FooterGroup = { group?: string; links?: LinkItem[] };

export default async function SettingsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const homeSlug = await homeChampionshipSlug();
  const [rows, seasonRows] = await Promise.all([
    db.select().from(siteSettings),
    // years of the home championship (default "incrc") drive the public site
    db
      .select({
        year: championshipSeasons.year,
        isCurrent: championshipSeasons.isCurrent,
        championshipShort: championships.shortName,
      })
      .from(championshipSeasons)
      .innerJoin(championships, eq(championshipSeasons.championshipId, championships.id))
      .where(eq(championships.slug, homeSlug))
      .orderBy(desc(championshipSeasons.year)),
  ]);
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  // jsonb values — shapes documented in packages/db/src/schema/settings.ts
  const currentSeason = (byKey.get("current_season") ?? {}) as { year?: number };
  const theme = (byKey.get("theme") ?? {}) as {
    accent?: string;
    accentDark?: string;
    accentFg?: string;
  };
  const banner = (byKey.get("broadcast_banner") ?? {}) as { enabled?: boolean; text?: string; href?: string };
  const navLinks = (byKey.get("nav_links") ?? []) as LinkItem[];
  const socialLinks = (byKey.get("social_links") ?? []) as SocialItem[];
  const footerGroups = (byKey.get("footer_links") ?? []) as FooterGroup[];

  const selectedYear =
    currentSeason.year ?? seasonRows.find((s) => s.isCurrent)?.year ?? seasonRows[0]?.year;

  const navText = navLinks.map((l) => `${l.label ?? ""} | ${l.href ?? ""}`).join("\n");
  const socialText = socialLinks.map((l) => `${l.platform ?? ""} | ${l.url ?? ""}`).join("\n");
  const footerText = footerGroups
    .map((g) =>
      [`# ${g.group ?? ""}`, ...(g.links ?? []).map((l) => `${l.label ?? ""} | ${l.href ?? ""}`)].join("\n"),
    )
    .join("\n\n");

  return (
    <>
      <PageHeader title="Site settings" sub="Global configuration for the public site." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current season */}
        <Card>
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Current season</h2>
          {seasonRows.length ? (
            <form action={updateCurrentSeasonAction} className="space-y-4">
              <Field
                label="Season"
                hint="Drives standings, schedule and driver/team pages on the public site."
              >
                <Select name="year" defaultValue={selectedYear != null ? String(selectedYear) : ""}>
                  {seasonRows.map((s) => (
                    <option key={s.year} value={s.year}>
                      {s.championshipShort} {s.year}
                      {s.isCurrent ? " (current)" : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton>Save season</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-f1-grey">
              The home championship (&ldquo;{homeSlug}&rdquo;) has no seasons yet — add one under
              Championships first.
            </p>
          )}
        </Card>

        {/* Theme */}
        <Card>
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Theme</h2>
          <form action={updateThemeAction} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Field label="Accent" hint="Primary brand colour.">
                <input
                  type="color"
                  name="accent"
                  defaultValue={theme.accent ?? "#F7D619"}
                  className="h-9 w-14 cursor-pointer border border-warm-grey bg-white p-0.5"
                />
              </Field>
              <Field label="Accent dark" hint="Hover / pressed shade.">
                <input
                  type="color"
                  name="accentDark"
                  defaultValue={theme.accentDark ?? "#E0BF06"}
                  className="h-9 w-14 cursor-pointer border border-warm-grey bg-white p-0.5"
                />
              </Field>
              <Field label="Accent foreground" hint="Text colour on accent surfaces.">
                <input
                  type="color"
                  name="accentFg"
                  defaultValue={theme.accentFg ?? "#0A0A0A"}
                  className="h-9 w-14 cursor-pointer border border-warm-grey bg-white p-0.5"
                />
              </Field>
            </div>
            <p className="text-xs text-f1-grey">
              Presets — CTR Yellow: #F7D619 · #E0BF06 · #0A0A0A &nbsp;·&nbsp; Racing Red: #E10600 ·
              #B30500 · #FFFFFF
            </p>
            <p className="text-xs text-f1-grey">
              The public site AND this admin CMS both read this setting — saving changes the accent
              colour in both apps.
            </p>
            <SubmitButton>Save theme</SubmitButton>
          </form>
        </Card>

        {/* Broadcast banner */}
        <Card>
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Broadcast banner</h2>
          <form action={updateBroadcastBannerAction} className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-carbon">
              <input type="checkbox" name="enabled" defaultChecked={banner.enabled ?? false} className="size-4 accent-f1-red" />
              Enabled — shown at the top of every page
            </label>
            <Field label="Text">
              <Input name="text" defaultValue={banner.text ?? ""} placeholder="Race weekend live now!" />
            </Field>
            <Field label="Link (href)" hint="Optional — makes the banner clickable.">
              <Input name="href" defaultValue={banner.href ?? ""} placeholder="/schedule" />
            </Field>
            <SubmitButton>Save banner</SubmitButton>
          </form>
        </Card>

        {/* Nav links */}
        <Card>
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Navigation links</h2>
          <form action={updateNavLinksAction} className="space-y-4">
            <Field label="Links" hint={'One per line: Label | /href'}>
              <Textarea
                name="links"
                rows={8}
                className="font-mono"
                defaultValue={navText}
                placeholder={"News | /news\nSchedule | /schedule\nStandings | /standings"}
              />
            </Field>
            <SubmitButton>Save navigation</SubmitButton>
          </form>
        </Card>

        {/* Social links */}
        <Card>
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Social links</h2>
          <form action={updateSocialLinksAction} className="space-y-4">
            <Field label="Links" hint={'One per line: platform | url'}>
              <Textarea
                name="links"
                rows={8}
                className="font-mono"
                defaultValue={socialText}
                placeholder={"instagram | https://instagram.com/ctrsports\nyoutube | https://youtube.com/@ctrsports"}
              />
            </Field>
            <SubmitButton>Save social links</SubmitButton>
          </form>
        </Card>

        {/* Footer links */}
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Footer links</h2>
          <form action={updateFooterLinksAction} className="space-y-4">
            <Field
              label="Sections"
              hint={'Start a section with "# Group Name", then one link per line: Label | /href'}
            >
              <Textarea
                name="links"
                rows={12}
                className="min-h-56 font-mono"
                defaultValue={footerText}
                placeholder={"# Explore\nNews | /news\nSchedule | /schedule\n\n# Legal\nPrivacy Policy | /privacy-policy"}
              />
            </Field>
            <SubmitButton>Save footer</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
