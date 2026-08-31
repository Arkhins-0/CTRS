/**
 * Single source of truth for RBAC — imported by the admin nav, every guard,
 * and the seed script.
 */

export const PERMISSIONS = {
  NEWS_MANAGE: "news.manage",
  RACES_MANAGE: "races.manage",
  RESULTS_MANAGE: "results.manage",
  TEAMS_MANAGE: "teams.manage",
  DRIVERS_MANAGE: "drivers.manage",
  MEDIA_READ: "media.read",
  MEDIA_MANAGE: "media.manage",
  VIDEOS_MANAGE: "videos.manage",
  PAGES_MANAGE: "pages.manage",
  FANZONE_MANAGE: "fanzone.manage",
  FANS_VIEW: "fans.view",
  NEWSLETTER_VIEW: "newsletter.view",
  NEWSLETTER_EXPORT: "newsletter.export",
  MEMBERS_MANAGE: "members.manage",
  ADMINS_MANAGE: "admins.manage",
  SETTINGS_MANAGE: "settings.manage",
  AUDIT_VIEW: "audit.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  "news.manage": "Create, edit and publish articles, categories and tags",
  "races.manage": "Manage race weekends, sessions and circuits",
  "results.manage": "Enter and publish session results; recalculate standings",
  "teams.manage": "Manage teams, season entries and cars",
  "drivers.manage": "Manage drivers and their season entries",
  "media.read": "Browse the media library (pickers)",
  "media.manage": "Upload, edit and delete media",
  "videos.manage": "Manage videos and galleries",
  "pages.manage": "Edit CMS pages, content blocks and sponsors",
  "fanzone.manage": "Manage polls and predictions",
  "fans.view": "View fan accounts",
  "newsletter.view": "View newsletter subscribers",
  "newsletter.export": "Export newsletter subscribers as CSV",
  "members.manage": "Manage organisation members, team rosters and invitations",
  "admins.manage": "Manage admin users and their roles",
  "settings.manage": "Edit site settings",
  "audit.view": "View the audit log",
};

/** Role keys → seeded role rows. */
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  MANAGER: "manager",
  NEWS_EDITOR: "news_editor",
  RACE_EDITOR: "race_editor",
  TEAM_MANAGER: "team_manager",
  DRIVER_MANAGER: "driver_manager",
  MEDIA_MANAGER: "media_manager",
  PAGE_EDITOR: "page_editor",
  FANZONE_EDITOR: "fanzone_editor",
} as const;

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

const P = PERMISSIONS;

export const ROLE_DEFINITIONS: Record<RoleKey, { name: string; permissions: Permission[] }> = {
  super_admin: { name: "Super Admin", permissions: ALL_PERMISSIONS },
  manager: {
    name: "Manager",
    permissions: ALL_PERMISSIONS.filter((p) => p !== P.ADMINS_MANAGE && p !== P.SETTINGS_MANAGE),
  },
  news_editor: { name: "News Editor", permissions: [P.NEWS_MANAGE, P.MEDIA_READ] },
  race_editor: {
    name: "Race Editor",
    permissions: [P.RACES_MANAGE, P.RESULTS_MANAGE, P.MEDIA_READ],
  },
  team_manager: {
    name: "Team Manager",
    permissions: [P.TEAMS_MANAGE, P.MEMBERS_MANAGE, P.MEDIA_READ],
  },
  driver_manager: { name: "Driver Manager", permissions: [P.DRIVERS_MANAGE, P.MEDIA_READ] },
  media_manager: {
    name: "Media Manager",
    permissions: [P.MEDIA_MANAGE, P.MEDIA_READ, P.VIDEOS_MANAGE],
  },
  page_editor: { name: "Page Editor", permissions: [P.PAGES_MANAGE, P.MEDIA_READ] },
  fanzone_editor: {
    name: "Fan Zone Editor",
    permissions: [P.FANZONE_MANAGE, P.FANS_VIEW, P.NEWSLETTER_VIEW],
  },
};
