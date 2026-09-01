"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, UserCircle2, X } from "lucide-react";

type NavLink = { label: string; href: string };

export function HeaderNav({
  links,
  secondary,
  fanName,
}: {
  links: NavLink[];
  secondary: NavLink[];
  fanName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes it, and the page behind is locked so it cannot be scrolled
  // away underneath the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const isActive = (href: string) => {
    const base = href.split("/").filter(Boolean)[0];
    const current = pathname.split("/").filter(Boolean)[0];
    return base === current;
  };

  return (
    <>
      {/* desktop nav links — F1 style: 2px underline, active in brand colour */}
      <nav className="hidden min-w-0 flex-1 items-stretch self-stretch lg:flex">
        <ul className="flex items-stretch gap-8 overflow-x-hidden">
          {links.map((l) => (
            <li key={l.href} className="flex items-stretch">
              <Link
                href={l.href}
                className={`flex items-center whitespace-nowrap border-b-2 px-2 py-1 font-display text-sm text-white transition-colors ${
                  isActive(l.href)
                    ? "border-brand font-medium"
                    : "border-transparent font-normal hover:border-white"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* hamburger — all breakpoints (mobile primary nav lives here) */}
      <button
        type="button"
        className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 lg:ml-0"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/*
       * Full-screen drawer, anchored to the viewport top with its OWN close
       * button. It used to start at a hard-coded offset matching the nav bar
       * (top-[54px]/58/64) — but the masthead above it adds height on desktop
       * and scrolls away again, so the offset was wrong exactly often enough
       * to leave the panel covering the hamburger that opens and closes it,
       * with no way out. Owning the close control removes the dependency on
       * the header's height entirely.
       */}
      {open ? (
        <div className="dark-section fixed inset-0 z-[60] overflow-y-auto bg-surface-3 pt-[env(safe-area-inset-top)]">
          <div className="f1-inner flex min-h-[54px] items-center justify-between gap-4 border-b border-surface-4 py-2 md:min-h-[58px] lg:min-h-[64px]">
            <span className="font-display text-sm font-bold uppercase tracking-wide text-white">
              Menu
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
            >
              <X size={22} />
            </button>
          </div>
          <div className="f1-inner py-8">
            <ul className="grid gap-1 min-[1440px]:grid-cols-2 min-[1440px]:gap-x-16">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`block border-b border-surface-4 py-4 font-display text-xl leading-7 text-white ${
                      isActive(l.href) ? "font-medium" : "font-normal"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              {secondary
                .filter((s) => !links.some((l) => l.href === s.href))
                .map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="block border-b border-surface-4 py-4 font-display text-xl font-normal leading-7 text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {fanName ? (
                <Link href="/account" className="btn btn-sm btn-white">
                  <UserCircle2 size={16} />
                  {fanName}
                </Link>
              ) : (
                <>
                  <Link href="/login" className="btn btn-sm btn-white">
                    Sign in
                  </Link>
                  <Link href="/register" className="btn btn-sm btn-brand">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
