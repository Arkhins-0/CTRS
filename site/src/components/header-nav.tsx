"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, UserCircle2, X } from "lucide-react";

type NavLink = { label: string; href: string };

export function HeaderNav({
  links,
  fanName,
}: {
  links: NavLink[];
  fanName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    const base = href.split("/").filter(Boolean)[0];
    const current = pathname.split("/").filter(Boolean)[0];
    return base === current;
  };

  return (
    <>
      {/* desktop */}
      <nav className="hidden flex-1 items-center lg:flex">
        <ul className="flex items-center">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`block border-b-[3px] px-4 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${
                  isActive(l.href)
                    ? "border-f1-red text-white"
                    : "border-transparent text-warm-grey hover:border-f1-red/60 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto">
          <Link
            href={fanName ? "/account" : "/login"}
            className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-warm-grey transition-colors hover:text-white"
          >
            <UserCircle2 size={18} />
            {fanName ?? "Sign in"}
          </Link>
        </div>
      </nav>

      {/* mobile toggle */}
      <button
        className="ml-auto p-2 text-white lg:hidden"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* mobile drawer */}
      {open ? (
        <div className="absolute inset-x-0 top-full z-50 border-t border-carbon-700 bg-carbon shadow-2xl lg:hidden">
          <ul className="px-4 py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-carbon-700 py-3 text-sm font-bold uppercase tracking-wide text-warm-grey hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={fanName ? "/account" : "/login"}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-3 text-sm font-bold uppercase tracking-wide text-f1-red"
              >
                <UserCircle2 size={18} />
                {fanName ?? "Sign in"}
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </>
  );
}
