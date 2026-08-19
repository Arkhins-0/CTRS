"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { filterNav } from "@/lib/nav";

export function Sidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const groups = filterNav(new Set(permissions));

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-5">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-f1-grey-light">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "chamfer-tr bg-f1-red text-white"
                        : "text-warm-grey hover:bg-carbon-700 hover:text-white"
                    }`}
                  >
                    <Icon size={16} strokeWidth={2.5} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
