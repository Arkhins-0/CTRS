"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { filterMemberNav } from "@/lib/member-nav";
import type { MemberRole } from "@/lib/member-auth";

/**
 * Member-area shell.
 *
 * Members have five destinations and are overwhelmingly on a phone at a
 * circuit, so this uses a thumb-reachable bottom tab bar rather than the CMS's
 * scrolling chip row — with so few items nothing needs to scroll, and a fixed
 * bar survives one-handed use in gloves better than a top strip.
 */
export function MemberShell({
  role,
  displayName,
  teamName,
  signOut,
  children,
}: {
  role: MemberRole;
  displayName: string;
  teamName: string | null;
  signOut: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = filterMemberNav(role);

  const isActive = (href: string) =>
    href === "/m" ? pathname === "/m" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh bg-page">
      <header className="dark-chrome safe-t sticky top-0 z-40 border-b border-line bg-page/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5">
          <Link href="/m" className="flex items-center gap-2">
            <Image src="/ctr-logo.webp" alt="CTR Sports" width={40} height={23} priority />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-fg">{displayName}</p>
            <p className="truncate text-[11px] text-fg-faint">
              {teamName ?? "Organisation official"}
            </p>
          </div>
          {signOut}
        </div>

        {/* Desktop: tabs live in the header, where there is room for them. */}
        <nav className="mx-auto hidden max-w-4xl gap-1 px-4 pb-2 sm:flex">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 px-3 text-xs font-bold uppercase tracking-wide transition-colors ${
                  active
                    ? "chamfer-tr bg-accent text-accent-fg"
                    : "border border-line text-fg-muted hover:text-fg"
                }`}
              >
                <Icon size={14} strokeWidth={2.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* pb clears the fixed bottom bar on phones */}
      <main className="mx-auto max-w-4xl px-4 py-5 pb-28 sm:pb-8">{children}</main>

      {/* Mobile: fixed bottom tabs. */}
      <nav className="dark-chrome safe-b fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page/95 backdrop-blur sm:hidden">
        <ul className="flex">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    active ? "text-accent" : "text-fg-faint hover:text-fg"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
