ALTER TYPE "public"."session_type" ADD VALUE 'race2';--> statement-breakpoint
CREATE TABLE "race_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(200) NOT NULL,
	"short_name" varchar(60) NOT NULL,
	"description" text,
	"car_spec" text,
	"color" varchar(7) DEFAULT '#FFC800' NOT NULL,
	"image_media_id" uuid,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "race_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "constructor_standings" DROP CONSTRAINT "constructor_standings_uq";--> statement-breakpoint
ALTER TABLE "driver_standings" DROP CONSTRAINT "driver_standings_uq";--> statement-breakpoint
ALTER TABLE "race_sessions" DROP CONSTRAINT "session_gp_type_uq";--> statement-breakpoint
ALTER TABLE "constructor_standings" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "driver_season_entries" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "driver_standings" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "race_sessions" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "race_sessions" ADD COLUMN "label" varchar(120);--> statement-breakpoint
ALTER TABLE "race_categories" ADD CONSTRAINT "race_categories_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_category_id_race_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."race_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_season_entries" ADD CONSTRAINT "driver_season_entries_category_id_race_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."race_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_category_id_race_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."race_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_sessions" ADD CONSTRAINT "race_sessions_category_id_race_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."race_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_uq" UNIQUE("season_year","category_id","team_season_entry_id");--> statement-breakpoint
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_uq" UNIQUE("season_year","category_id","driver_id");--> statement-breakpoint
ALTER TABLE "race_sessions" ADD CONSTRAINT "session_gp_cat_type_uq" UNIQUE("grand_prix_id","category_id","type");