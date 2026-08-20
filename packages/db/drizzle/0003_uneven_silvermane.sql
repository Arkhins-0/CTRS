ALTER TABLE "cars" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "constructor_standings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "driver_season_entries" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "driver_standings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "grands_prix" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "race_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "seasons" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session_results" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "team_season_entries" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "cars" CASCADE;--> statement-breakpoint
DROP TABLE "constructor_standings" CASCADE;--> statement-breakpoint
DROP TABLE "driver_season_entries" CASCADE;--> statement-breakpoint
DROP TABLE "driver_standings" CASCADE;--> statement-breakpoint
DROP TABLE "grands_prix" CASCADE;--> statement-breakpoint
DROP TABLE "race_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "seasons" CASCADE;--> statement-breakpoint
DROP TABLE "session_results" CASCADE;--> statement-breakpoint
DROP TABLE "team_season_entries" CASCADE;--> statement-breakpoint
ALTER TABLE "polls" DROP CONSTRAINT IF EXISTS "polls_grand_prix_id_grands_prix_id_fk";
--> statement-breakpoint
ALTER TABLE "polls" DROP COLUMN "grand_prix_id";