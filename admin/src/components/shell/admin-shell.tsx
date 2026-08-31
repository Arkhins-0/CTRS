"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen, User } from "lucide-react";
import { filterNav, type NavGroup } from "@/lib/nav";

const COLLAPSE_KEY = "ctr-admin-rail-collapsed";

export type ShellUser = { displayName: string; email: string };

function useActiveMatcher() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/* ── Desktop rail ────────────────────────────────────────────────────────── */

function DesktopRail({
  groups,
  user,
  signOut,
  collapsed,
  onToggle,
}: {
  groups: NavGroup[];
  user: ShellUser;
  signOut: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const isActive = useActiveMatcher();

  return (
    <aside
      className={`safe-l fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-page lg:flex ${
        collapsed ? "w-16" : "w-60"
      } transition-[width] duration-200`}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2" title="CTR Sports Admin">
          <Image src="/ctr-logo.webp" alt="" width={36} height={20} className="shrink-0" priority />
          {!collapsed && (
            <span className="truncate text-sm font-black uppercase tracking-wider text-fg">
              Admin
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="ml-auto grid size-9 shrink-0 place-items-center text-fg-faint transition-colors hover:text-fg"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-4">
        {groups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-fg-faint">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-2.5 px-3 text-sm font-semibold transition-colors ${
                        collapsed ? "justify-center" : ""
                      } ${
                        active
                          ? "chamfer-tr bg-accent text-accent-fg"
                          : "text-fg-muted hover:bg-panel hover:text-fg"
                      }`}
                    >
                      <Icon size={16} strokeWidth={2.5} className="shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="safe-b border-t border-line p-3">
        {!collapsed && (
          <Link href="/account" className="block truncate hover:underline">
            <p className="truncate text-xs font-bold text-fg">{user.displayName}</p>
            <p className="truncate text-[11px] text-fg-faint">{user.email}</p>
          </Link>
        )}
        <div className={collapsed ? "" : "mt-2"}>{signOut}</div>
      </div>
    </aside>
  );
}

/* ── Mobile bar + chip nav ───────────────────────────────────────────────── */

/**
 * Below lg the rail becomes a sticky bar plus a horizontally scrolling chip
 * row that renders the *same* nav list — nothing is hidden behind a "more"
 * menu, so every destination stays one tap away. The active chip scrolls
 * itself into view so you can always see where you are.
 */
function MobileNav({
  groups,
  user,
  signOut,
}: {
  groups: NavGroup[];
  user: ShellUser;
  signOut: React.ReactNode;
}) {
  const isActive = useActiveMatcher();
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const items = groups.flatMap((g) => g.items);

  return (
    <header className="safe-t sticky top-0 z-40 border-b border-line bg-page/95 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/ctr-logo.webp" alt="CTR Sports" width={40} height={23} priority />
          <span className="text-sm font-black uppercase tracking-wider text-fg">Admin</span>
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label="Account menu"
          className="ml-auto grid size-11 place-items-center border border-line text-fg-muted transition-colors hover:text-fg"
        >
          <User size={18} />
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-surface px-4 py-3">
          <p className="truncate text-xs font-bold text-fg">{user.displayName}</p>
          <p className="truncate text-[11px] text-fg-faint">{user.email}</p>
          <div className="mt-3 flex items-center gap-4">
            <Link href="/account" className="text-xs font-bold uppercase tracking-wide text-fg-muted hover:text-fg">
              Account
            </Link>
            {signOut}
          </div>
        </div>
      )}

      <div
        className="flex gap-1.5 overflow-x-auto px-3 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
          WebkitMaskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-xs font-bold uppercase tracking-wide transition-colors ${
                active
                  ? "chamfer-tr bg-accent text-accent-fg"
                  : "border border-line text-fg-muted hover:text-fg"
              }`}
            >
              <Icon size={13} strokeWidth={2.5} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}

/* ── Shell ───────────────────────────────────────────────────────────────── */

export function AdminShell({
  permissions,
  user,
  signOut,
  children,
}: {
  permissions: string[];
  user: ShellUser;
  signOut: React.ReactNode;
  children: React.ReactNode;
}) {
  const groups = filterNav(new Set(permissions));
  const [collapsed, setCollapsed] = useState(false);

  // Read the stored preference after mount — the server render can't know it,
  // and rendering the wrong width first would flash a layout shift.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // blocked storage — keep the expanded default
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // preference simply won't persist
      }
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-page">
      <MobileNav groups={groups} user={user} signOut={signOut} />
      <DesktopRail
        groups={groups}
        user={user}
        signOut={signOut}
        collapsed={collapsed}
        onToggle={toggle}
      />
      <main
        className={`safe-b safe-r min-h-dvh px-4 py-5 transition-[margin] duration-200 sm:px-6 lg:py-7 ${
          collapsed ? "lg:ml-16" : "lg:ml-60"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
