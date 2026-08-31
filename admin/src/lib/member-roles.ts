import type { MemberRole } from "./member-auth";

/**
 * Member role model — client-safe (no db import, usable in components).
 *
 * Authority inside a team is a hierarchy, not a flat list:
 *
 *   team_manager  runs the team; appoints managers and every role below
 *   manager       appointed by the team manager; creates accounts for THIS
 *                 team only, but cannot appoint other managers
 *   driver/media/crew   ordinary members; no roster rights
 *   official      organisation-wide; only CMS staff may grant it
 *
 * ASSIGNABLE_BY is the single source of truth for who may hand out what.
 * Every guard derives from it rather than testing role strings inline, so the
 * hierarchy can only be changed in one place.
 */

export const MEMBER_ROLES: MemberRole[] = [
  "team_manager",
  "manager",
  "driver",
  "media",
  "crew",
  "official",
];

export const ROLE_LABELS: Record<MemberRole, string> = {
  team_manager: "Team manager",
  manager: "Manager",
  driver: "Driver",
  media: "Media",
  crew: "Crew",
  official: "Official",
};

export const ROLE_HINTS: Record<MemberRole, string> = {
  team_manager: "Runs the team. Can appoint managers and everyone else on the roster.",
  manager: "Can add drivers, media and crew to this team. Cannot appoint other managers.",
  driver: "Races for the team. Sees the schedule, announcements and their own availability.",
  media: "Press and media for the team. Same access as crew.",
  crew: "Mechanics, engineers and general crew.",
  official: "Organisation-wide: stewards, marshals and race control. Not attached to a team.",
};

/**
 * Which roles each role may grant.
 *
 * A team manager may appoint a co-manager (team_manager) so a team is never
 * left without one when someone leaves. A manager deliberately cannot mint
 * managers — that would let any manager escalate the whole team sideways.
 * `official` appears nowhere here: it is organisation-wide and only CMS staff
 * with members.manage may grant it.
 */
export const ASSIGNABLE_BY: Record<MemberRole, MemberRole[]> = {
  team_manager: ["team_manager", "manager", "driver", "media", "crew"],
  manager: ["driver", "media", "crew"],
  driver: [],
  media: [],
  crew: [],
  official: [],
};

/** Roles CMS staff may hand out — everything, including org-wide officials. */
export const ADMIN_ASSIGNABLE_ROLES: MemberRole[] = MEMBER_ROLES;

/** True when the role may see and change its team's roster at all. */
export function canManageRoster(role: MemberRole): boolean {
  return ASSIGNABLE_BY[role].length > 0;
}

/** True when `actor` may grant `target`. */
export function canAssignRole(actor: MemberRole, target: MemberRole): boolean {
  return ASSIGNABLE_BY[actor].includes(target);
}

/**
 * True when `actor` may deactivate, reactivate or re-invite someone holding
 * `target`.
 *
 * Reuses the assignment matrix on purpose: you may only act on people whose
 * role you could have granted. Without this a manager could deactivate the
 * team manager who appointed them.
 */
export function canActOnRole(actor: MemberRole, target: MemberRole): boolean {
  return canAssignRole(actor, target);
}

/** Roles that belong to a team — everything except org-wide officials. */
export function isTeamRole(role: MemberRole): boolean {
  return role !== "official";
}

export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === "string" && (MEMBER_ROLES as string[]).includes(value);
}
