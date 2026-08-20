import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { asc, eq } from "drizzle-orm";
import { db, sponsors, TAGS } from "@ctr/db";
import { cached } from "@/lib/cache";
import { mediaUrl } from "@/lib/media";
import { getSetting } from "@/lib/settings";

type FooterGroup = { group: string; links: { label: string; href: string }[] };
type SocialLink = { platform: string; url: string };

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  x: Twitter,
  twitter: Twitter,
  youtube: Youtube,
};

export async function SiteFooter() {
  const [groups, socials, partnerRows] = await Promise.all([
    getSetting<FooterGroup[]>("footer_links", []),
    getSetting<SocialLink[]>("social_links", []),
    cached(
      () =>
        db.query.sponsors.findMany({
          where: eq(sponsors.isActive, true),
          orderBy: [asc(sponsors.sort)],
          with: { logo: true },
        }),
      ["footer-sponsors"],
      [TAGS.sponsors],
      3600,
    ),
  ]);

  return (
    <footer className="mt-16 border-t border-line bg-surface text-white">
      {partnerRows.length ? (
        <div className="border-b border-line">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-fg-faint">
              Championship Partners
            </p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {partnerRows.map((p) => {
                const url = mediaUrl(p.logo?.path);
                return (
                  <li key={p.id} className="opacity-70 transition-opacity hover:opacity-100">
                    {url ? (
                      <Image src={url} alt={p.name} width={90} height={28} className="h-7 w-auto object-contain" />
                    ) : (
                      <span className="text-sm font-bold uppercase tracking-wider text-fg-muted">
                        {p.name}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap justify-between gap-10">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="chamfer-tr bg-accent px-2.5 py-1 text-lg font-black uppercase italic leading-none text-accent-fg">
                CTR
              </span>
              <span className="text-lg font-black uppercase tracking-wider">Sports</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm font-semibold text-fg-muted">
              CTR Unified — One Nation. One Championship.
            </p>
            <p className="mt-2 max-w-xs text-sm text-fg-faint">
              29, Tilak Street, T. Nagar, Chennai, Tamil Nadu 600017 · 9500016999 ·{" "}
              admin@ctrsports.in
            </p>
            {socials.length ? (
              <ul className="mt-4 flex items-center gap-3">
                {socials.map((s) => {
                  const Icon = SOCIAL_ICONS[s.platform.toLowerCase()];
                  return (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.platform}
                        className="flex h-9 w-9 items-center justify-center border border-line text-fg-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        {Icon ? (
                          <Icon size={16} aria-hidden />
                        ) : (
                          <span className="text-[10px] font-black uppercase">
                            {s.platform.slice(0, 2)}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          {groups.map((g) => (
            <div key={g.group}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-fg-faint">{g.group}</p>
              <ul className="mt-3 space-y-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm font-semibold text-fg-muted hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-line pt-5 text-xs text-fg-faint">
          <p>© {new Date().getFullYear()} CTR Sports · CTR Unified</p>
        </div>
      </div>
    </footer>
  );
}
