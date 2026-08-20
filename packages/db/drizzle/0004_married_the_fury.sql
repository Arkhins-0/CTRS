CREATE TABLE "cars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_season_entry_id" uuid NOT NULL,
	"model_name" varchar(60) NOT NULL,
	"chassis" varchar(120),
	"power_unit" varchar(120),
	"specs" jsonb,
	"image_media_id" uuid,
	CONSTRAINT "cars_team_season_entry_id_unique" UNIQUE("team_season_entry_id")
);
--> statement-breakpoint
CREATE TABLE "championship_seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"championship_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"points_system" jsonb DEFAULT '{"race":[25,18,15,12,10,8,6,4,2,1],"sprint":[8,7,6,5,4,3,2,1]}'::jsonb NOT NULL,
	"standings_types" text[] DEFAULT '{"overall","team"}' NOT NULL,
	CONSTRAINT "championship_season_uq" UNIQUE("championship_id","year")
);
--> statement-breakpoint
CREATE TABLE "championships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_name" varchar(60) NOT NULL,
	"type" varchar(40) DEFAULT 'mixed' NOT NULL,
	"description" text,
	"logo_media_id" uuid,
	"primary_color" varchar(7) DEFAULT '#F7D619' NOT NULL,
	"secondary_color" varchar(7),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "championships_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "constructor_standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"championship_season_id" uuid NOT NULL,
	"team_season_entry_id" uuid NOT NULL,
	"category_id" uuid,
	"standings_type" varchar(30) DEFAULT 'team' NOT NULL,
	"position" integer NOT NULL,
	"points" real DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"computed_through_round" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "constructor_standings_uq" UNIQUE("championship_season_id","category_id","standings_type","team_season_entry_id")
);
--> statement-breakpoint
CREATE TABLE "driver_season_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"team_season_entry_id" uuid NOT NULL,
	"championship_season_id" uuid NOT NULL,
	"category_id" uuid,
	"classification" varchar(30),
	"car_number" integer NOT NULL,
	"role" "driver_role" DEFAULT 'primary' NOT NULL,
	"from_round" integer,
	"to_round" integer,
	CONSTRAINT "driver_entry_uq" UNIQUE("driver_id","team_season_entry_id","from_round")
);
--> statement-breakpoint
CREATE TABLE "driver_standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"championship_season_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"category_id" uuid,
	"standings_type" varchar(30) DEFAULT 'overall' NOT NULL,
	"position" integer NOT NULL,
	"points" real DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"podiums" integer DEFAULT 0 NOT NULL,
	"poles" integer DEFAULT 0 NOT NULL,
	"computed_through_round" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "driver_standings_uq" UNIQUE("championship_season_id","category_id","standings_type","driver_id")
);
--> statement-breakpoint
CREATE TABLE "race_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"category_id" uuid,
	"type" "session_type" NOT NULL,
	"sequence" integer DEFAULT 1 NOT NULL,
	"label" varchar(120),
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" "session_status" DEFAULT 'scheduled' NOT NULL,
	CONSTRAINT "session_round_cat_type_seq_uq" UNIQUE("round_id","category_id","type","sequence")
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"championship_season_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(200) NOT NULL,
	"official_name" varchar(255),
	"circuit_id" uuid NOT NULL,
	"start_date" date,
	"end_date" date,
	"has_sprint" boolean DEFAULT false NOT NULL,
	"status" "gp_status" DEFAULT 'scheduled' NOT NULL,
	"hero_media_id" uuid,
	CONSTRAINT "round_season_number_uq" UNIQUE("championship_season_id","round"),
	CONSTRAINT "round_season_slug_uq" UNIQUE("championship_season_id","slug")
);
--> statement-breakpoint
CREATE TABLE "session_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"driver_season_entry_id" uuid NOT NULL,
	"position" integer,
	"status" "result_status" DEFAULT 'finished' NOT NULL,
	"grid_position" integer,
	"laps" integer,
	"time_ms" bigint,
	"gap_ms" bigint,
	"laps_behind" integer,
	"q1_time_ms" integer,
	"q2_time_ms" integer,
	"q3_time_ms" integer,
	"points" real DEFAULT 0 NOT NULL,
	"fastest_lap" boolean DEFAULT false NOT NULL,
	"fastest_lap_time_ms" integer,
	CONSTRAINT "result_session_entry_uq" UNIQUE("session_id","driver_season_entry_id")
);
--> statement-breakpoint
CREATE TABLE "team_season_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"championship_season_id" uuid NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"short_name" varchar(60) NOT NULL,
	"primary_color" varchar(7) DEFAULT '#67676d' NOT NULL,
	"secondary_color" varchar(7),
	"team_principal" varchar(120),
	"power_unit_supplier" varchar(120),
	"logo_media_id" uuid,
	"car_image_media_id" uuid,
	CONSTRAINT "team_season_uq" UNIQUE("team_id","championship_season_id")
);
--> statement-breakpoint
ALTER TABLE "race_categories" ADD COLUMN "championship_id" uuid;--> statement-breakpoint
ALTER TABLE "polls" ADD COLUMN "round_id" uuid;--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_team_season_entry_id_team_season_entries_id_fk" FOREIGN KEY ("team_season_entry_id") REFERENCES "public"."team_season_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "championship_seasons" ADD CONSTRAINT "championship_seasons_championship_id_championships_id_fk" FOREIGN KEY ("championship_id") REFERENCES "public"."championships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "championships" ADD CONSTRAINT "championships_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_championship_season_id_championship_seasons_id_fk" FOREIGN KEY ("championship_season_id") REFERENCES "public"."championship_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_team_season_entry_id_team_season_entries_id_fk" FOREIGN KEY ("team_season_entry_id") REFERENCES "public"."team_season_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_category_id_race_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."race_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_season_entries" ADD CONSTRAINT "driver_season_entries_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_season_entries" ADD CONSTRAINT "driver_season_entries_team_season_entry_id_team_season_entries_id_fk" FOREIGN KEY ("team_season_entry_id") REFERENCES "public"."team_season_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_season_entries" ADD CONSTRAINT "driver_season_entries_championship_season_id_championship_seasons_id_fk" FOREIGN KEY ("championship_season_id") REFERENCES "public"."championship_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_season_entries" ADD CONSTRAINT "driver_season_entries_category_id_race_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."race_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_championship_season_id_championship_seasons_id_fk" FOREIGN KEY ("championship_season_id") REFERENCES "public"."championship_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_category_id_race_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."race_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_sessions" ADD CONSTRAINT "race_sessions_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_sessions" ADD CONSTRAINT "race_sessions_category_id_race_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."race_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_championship_season_id_championship_seasons_id_fk" FOREIGN KEY ("championship_season_id") REFERENCES "public"."championship_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_circuit_id_circuits_id_fk" FOREIGN KEY ("circuit_id") REFERENCES "public"."circuits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_session_id_race_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."race_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_driver_season_entry_id_driver_season_entries_id_fk" FOREIGN KEY ("driver_season_entry_id") REFERENCES "public"."driver_season_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_season_entries" ADD CONSTRAINT "team_season_entries_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_season_entries" ADD CONSTRAINT "team_season_entries_championship_season_id_championship_seasons_id_fk" FOREIGN KEY ("championship_season_id") REFERENCES "public"."championship_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_season_entries" ADD CONSTRAINT "team_season_entries_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_season_entries" ADD CONSTRAINT "team_season_entries_car_image_media_id_media_id_fk" FOREIGN KEY ("car_image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "driver_entries_season_idx" ON "driver_season_entries" USING btree ("championship_season_id");--> statement-breakpoint
CREATE INDEX "results_session_idx" ON "session_results" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "results_entry_idx" ON "session_results" USING btree ("driver_season_entry_id");--> statement-breakpoint
ALTER TABLE "race_categories" ADD CONSTRAINT "race_categories_championship_id_championships_id_fk" FOREIGN KEY ("championship_id") REFERENCES "public"."championships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE set null ON UPDATE no action;