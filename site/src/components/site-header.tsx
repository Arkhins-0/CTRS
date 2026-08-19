import Link from "next/link";
import { getFanSession } from "@/lib/fan-auth";
import { getSetting } from "@/lib/settings";
import { HeaderNav } from "./header-nav";

const DEFAULT_LINKS = [
  { label: "Latest", href: "/latest" },
  { label: "Video", href: "/video" },
  { label: "Schedule", href: "/schedule" },
  { label: "Results", href: "/results/2026" },
  { label: "Standings", href: "/standings/2026/drivers" },
  { label: "Drivers", href: "/drivers" },
  { label: "Teams", href: "/teams" },
];

export async function SiteHeader() {
  const [links, fan, banner] = await Promise.all([
    getSetting<{ label: string; href: string }[]>("nav_links", DEFAULT_LINKS),
    getFanSession(),
    getSetting<{ enabled: boolean; text: string; href: string }>("broadcast_banner", {
      enabled: false,
      text: "",
      href: "",
    }),
  ]);

  return (
    <header className="sticky top-0 z-50">
      {banner.enabled && banner.text ? (
        <Link
          href={banner.href || "#"}
          className="block bg-f1-red px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-white"
        >
          {banner.text}
        </Link>
      ) : null}
      <div className="relative border-b-[3px] border-f1-red bg-carbon">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 py-3">
            <span className="chamfer-tr bg-f1-red px-2.5 py-1 text-lg font-black uppercase italic leading-none text-white">
              CTR
            </span>
            <span className="text-lg font-black uppercase tracking-wider text-white">Sports</span>
          </Link>
          <HeaderNav links={links} fanName={fan?.fan.displayName ?? null} />
        </div>
      </div>
    </header>
  );
}
