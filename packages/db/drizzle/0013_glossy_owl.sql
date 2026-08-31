--> Rework member_role into a per-team hierarchy.
--
-- Generated as a plain cast back to the enum, which would abort with
-- "invalid input value for enum member_role" on any surviving 'team_admin' or
-- 'team_member' row. The tables happen to be empty today, but a migration must
-- not depend on that — the USING clauses below remap the retired values:
--   team_admin  -> team_manager
--   team_member -> crew
ALTER TABLE "member_invitations" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "member_invitations" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."member_role";--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('team_manager', 'manager', 'driver', 'media', 'crew', 'official');--> statement-breakpoint
ALTER TABLE "member_invitations" ALTER COLUMN "role" SET DATA TYPE "public"."member_role" USING (
  CASE "role"
    WHEN 'team_admin' THEN 'team_manager'
    WHEN 'team_member' THEN 'crew'
    ELSE "role"
  END
)::"public"."member_role";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "role" SET DATA TYPE "public"."member_role" USING (
  CASE "role"
    WHEN 'team_admin' THEN 'team_manager'
    WHEN 'team_member' THEN 'crew'
    ELSE "role"
  END
)::"public"."member_role";--> statement-breakpoint
ALTER TABLE "member_invitations" ALTER COLUMN "role" SET DEFAULT 'crew'::"public"."member_role";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "role" SET DEFAULT 'crew'::"public"."member_role";
