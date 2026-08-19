import Link from "next/link";
import Image from "next/image";
import { asc, eq } from "drizzle-orm";
import { db, sponsors, TAGS } from "@ctr/db";
import { cached } from "@/lib/cache";
import { mediaUrl } from "@/lib/media";
import { getSetting } from "@/lib/settings";

type FooterGroup = { group: string; links: { label: string; href: string }[] };

export async function SiteFooter() {
  const [groups, partnerRows] = await Promise.all([
    getSetting<FooterGroup[]>("footer_links", []),
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
    <footer className="mt-16 bg-carbon text-white">
      {partnerRows.length ? (
        <div className="border-b border-carbon-700">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-f1-grey-light">
              Official Partners
            </p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {partnerRows.map((p) => {
                const url = mediaUrl(p.logo?.path);
                return (
                  <li key={p.id} className="opacity-70 transition-opacity hover:opacity-100">
                    {url ? (
                      <Image src={url} alt={p.name} width={90} height={28} className="h-7 w-auto object-contain" />
                    ) : (
                      <span className="text-sm font-bold uppercase tracking-wider">{p.name}</span>
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
              <span className="chamfer-tr bg-f1-red px-2.5 py-1 text-lg font-black uppercase italic leading-none">
                CTR
              </span>
              <span className="text-lg font-black uppercase tracking-wider">Sports</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-f1-grey-light">
              Independent coverage of Formula Racing — every session, every result, every story.
            </p>
          </div>
          {groups.map((g) => (
            <div key={g.group}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-f1-grey-light">{g.group}</p>
              <ul className="mt-3 space-y-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm font-semibold text-warm-grey hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-carbon-700 pt-5 text-xs text-f1-grey-light">
          <p>
            © {new Date().getFullYear()} CTR Sports. A fan project — not associated with Formula 1
            companies. F1® and related marks are trademarks of Formula One Licensing B.V.
          </p>
        </div>
      </div>
    </footer>
  );
}
