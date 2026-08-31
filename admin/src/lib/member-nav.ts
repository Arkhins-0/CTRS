import type { LucideIcon } from "lucide-react";
import { Bell, CalendarDays, LayoutDashboard, UserCog, Users } from "lucide-react";
import type { MemberRole } from "./member-auth";

export type MemberNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** null = every member; otherwise the roles that may see it. */
  roles: MemberRole[] | null;
};

/** Single source for the member-area nav — mirrors lib/nav.ts for the CMS. */
export const MEMBER_NAV: MemberNavItem[] = [
  { href: "/m", label: "Home", icon: LayoutDashboard, roles: null },
  { href: "/m/schedule", label: "Schedule", icon: CalendarDays, roles: null },
  { href: "/m/announcements", label: "Announcements", icon: Bell, roles: null },
  { href: "/m/roster", label: "Roster", icon: Users, roles: ["team_admin"] },
  { href: "/m/account", label: "Account", icon: UserCog, roles: null },
];

export function filterMemberNav(role: MemberRole): MemberNavItem[] {
  return MEMBER_NAV.filter((i) => i.roles === null || i.roles.includes(role));
}
