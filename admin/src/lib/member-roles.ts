import type { MemberRole } from "./member-auth";

/** Client-safe role labels and copy (no db import — usable in components). */

export const ROLE_LABELS: Record<MemberRole, string> = {
  team_admin: "Team admin",
  team_member: "Team member",
  official: "Official",
};

export const ROLE_HINTS: Record<MemberRole, string> = {
  team_admin: "Manages this team's roster and can invite other members.",
  team_member: "Crew, driver or engineer. Sees their team's schedule and announcements.",
  official: "Organisation-wide: stewards, marshals and race control. Not attached to a team.",
};

/** Roles a team admin may hand out — never `official`, which is org-wide. */
export const TEAM_ASSIGNABLE_ROLES: MemberRole[] = ["team_admin", "team_member"];

/** Roles CMS staff may hand out. */
export const ADMIN_ASSIGNABLE_ROLES: MemberRole[] = ["team_admin", "team_member", "official"];

export function isMemberRole(value: unknown): value is MemberRole {
  return value === "team_admin" || value === "team_member" || value === "official";
}
