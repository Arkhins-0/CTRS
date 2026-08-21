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

      {/* full-screen drawer */}
      {open ? (
        <div className="dark-section fixed inset-0 top-[54px] z-50 overflow-y-auto bg-surface-3 md:top-[58px] lg:top-[64px]">
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
