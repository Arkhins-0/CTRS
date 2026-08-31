"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, User, X } from "lucide-react";
import { filterNav, type NavGroup } from "@/lib/nav";

const COLLAPSE_KEY = "ctr-admin-rail-collapsed";

export type ShellUser = { displayName: string; email: string };

function useActiveMatcher() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/* ── Shared nav list ─────────────────────────────────────────────────────── */

function NavList({
  groups,
  collapsed = false,
  onNavigate,
}: {
  groups: NavGroup[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const isActive = useActiveMatcher();

  return (
    <>
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
                    onClick={onNavigate}
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
    </>
  );
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
  return (
    <aside
      className={`safe-l safe-b fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-page lg:flex ${
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
        <NavList groups={groups} collapsed={collapsed} />
      </nav>

      <div className="border-t border-line p-3">
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

/* ── Mobile bar + slide-out drawer ───────────────────────────────────────── */

/**
 * Below lg the rail becomes a hamburger and a slide-out drawer carrying the
 * full grouped nav.
 *
 * This replaced a horizontally scrolling chip row: the CMS has ~24
 * destinations across five groups, and a single-line strip both loses the
 * group headings that give those items meaning and forces a horizontal hunt
 * for anything past the third item. A drawer shows the whole tree at once.
 * (The member area keeps its bottom tab bar — five destinations, no grouping,
 * and worth the permanent thumb reach.)
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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on navigation — the drawer must not survive into the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes; lock body scroll so the page behind cannot be scrolled away.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <header className="safe-t sticky top-0 z-40 border-b border-line bg-page/95 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="grid size-11 place-items-center border border-line text-fg-muted transition-colors hover:text-fg"
          >
            <Menu size={18} />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <Image src="/ctr-logo.webp" alt="CTR Sports" width={40} height={23} priority />
            <span className="text-sm font-black uppercase tracking-wider text-fg">Admin</span>
          </Link>

          <Link
            href="/account"
            aria-label="Account"
            className="ml-auto grid size-11 place-items-center border border-line text-fg-muted transition-colors hover:text-fg"
          >
            <User size={18} />
          </Link>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="safe-t safe-b absolute inset-y-0 left-0 flex w-[17rem] max-w-[85vw] flex-col border-r border-line bg-page outline-none"
          >
            <div className="flex items-center gap-2 border-b border-line px-3 py-3">
              <Image src="/ctr-logo.webp" alt="" width={36} height={20} priority />
              <span className="text-sm font-black uppercase tracking-wider text-fg">Admin</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="ml-auto grid size-10 place-items-center text-fg-faint transition-colors hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-4">
              <NavList groups={groups} onNavigate={() => setOpen(false)} />
            </nav>

            <div className="border-t border-line p-3">
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="block truncate hover:underline"
              >
                <p className="truncate text-xs font-bold text-fg">{user.displayName}</p>
                <p className="truncate text-[11px] text-fg-faint">{user.email}</p>
              </Link>
              <div className="mt-2">{signOut}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
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
        /* Bottom inset is folded into the padding value rather than applied
           via .safe-b, which would override py-5 entirely. */
        className={`min-h-dvh px-4 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] transition-[margin] duration-200 sm:px-6 lg:pt-7 lg:pb-[calc(1.75rem+env(safe-area-inset-bottom))] ${
          collapsed ? "lg:ml-16" : "lg:ml-60"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
