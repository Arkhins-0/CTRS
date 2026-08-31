// subpath import — keeps this file safe for client components (no db client)
import { PERMISSIONS, type Permission } from "@ctr/db/permissions";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Flag,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  ListChecks,
  Mail,
  MapPin,
  Medal,
  Newspaper,
  ScrollText,
  Settings,
  Shield,
  Trophy,
  Users,
  UsersRound,
  Vote,
  Video,
  FileText,
  Handshake,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission | null; // null = any admin
};

export type NavGroup = { title: string; items: NavItem[] };

/** Single source for admin navigation — filtered server-side per session. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard, permission: null }],
  },
  {
    title: "Editorial",
    items: [
      { href: "/news", label: "News", icon: Newspaper, permission: PERMISSIONS.NEWS_MANAGE },
      { href: "/announcements", label: "Announcements", icon: Bell, permission: PERMISSIONS.NEWS_MANAGE },
      { href: "/media", label: "Media Library", icon: ImageIcon, permission: PERMISSIONS.MEDIA_MANAGE },
      { href: "/videos", label: "Videos", icon: Video, permission: PERMISSIONS.VIDEOS_MANAGE },
      { href: "/pages", label: "Pages", icon: FileText, permission: PERMISSIONS.PAGES_MANAGE },
      { href: "/sponsors", label: "Sponsors", icon: Handshake, permission: PERMISSIONS.PAGES_MANAGE },
    ],
  },
  {
    title: "Racing",
    items: [
      { href: "/championships", label: "Championships", icon: Medal, permission: PERMISSIONS.RACES_MANAGE },
      { href: "/races", label: "Race Weekends", icon: CalendarDays, permission: PERMISSIONS.RACES_MANAGE },
      { href: "/categories", label: "Categories", icon: Layers, permission: PERMISSIONS.RACES_MANAGE },
      { href: "/circuits", label: "Circuits", icon: MapPin, permission: PERMISSIONS.RACES_MANAGE },
      { href: "/results", label: "Results Entry", icon: ListChecks, permission: PERMISSIONS.RESULTS_MANAGE },
      { href: "/standings", label: "Standings", icon: Trophy, permission: PERMISSIONS.RESULTS_MANAGE },
      { href: "/teams", label: "Teams & Cars", icon: Flag, permission: PERMISSIONS.TEAMS_MANAGE },
      { href: "/drivers", label: "Drivers", icon: Users, permission: PERMISSIONS.DRIVERS_MANAGE },
    ],
  },
  {
    title: "Fan Zone",
    items: [
      { href: "/polls", label: "Polls & Predictions", icon: Vote, permission: PERMISSIONS.FANZONE_MANAGE },
      { href: "/fans", label: "Fan Accounts", icon: UsersRound, permission: PERMISSIONS.FANS_VIEW },
      { href: "/newsletter", label: "Newsletter", icon: Mail, permission: PERMISSIONS.NEWSLETTER_VIEW },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/members", label: "Members", icon: UsersRound, permission: PERMISSIONS.MEMBERS_MANAGE },
      { href: "/admins", label: "Admin Users", icon: Shield, permission: PERMISSIONS.ADMINS_MANAGE },
      { href: "/audit", label: "Audit Log", icon: ScrollText, permission: PERMISSIONS.AUDIT_VIEW },
      { href: "/settings", label: "Site Settings", icon: Settings, permission: PERMISSIONS.SETTINGS_MANAGE },
    ],
  },
];

export function filterNav(perms: Set<string>): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.permission === null || perms.has(i.permission)),
  })).filter((g) => g.items.length > 0);
}
