CREATE TYPE "public"."block_type" AS ENUM('hero', 'rich_text', 'image', 'image_grid', 'cta', 'faq', 'sponsor_grid', 'raw_html');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'file', 'video');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."sponsor_tier" AS ENUM('global_partner', 'official_partner', 'supplier');--> statement-breakpoint
CREATE TYPE "public"."video_provider" AS ENUM('youtube', 'file');--> statement-breakpoint
CREATE TYPE "public"."driver_role" AS ENUM('primary', 'reserve');--> statement-breakpoint
CREATE TYPE "public"."gp_status" AS ENUM('scheduled', 'live', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."result_status" AS ENUM('finished', 'dnf', 'dns', 'dsq', 'nc');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'live', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('fp1', 'fp2', 'fp3', 'sprint_qualifying', 'sprint', 'qualifying', 'race');--> statement-breakpoint
CREATE TYPE "public"."favourite_entity" AS ENUM('driver', 'team');--> statement-breakpoint
CREATE TYPE "public"."poll_kind" AS ENUM('poll', 'prediction');--> statement-breakpoint
CREATE TYPE "public"."poll_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'confirmed', 'unsubscribed');--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" varchar(60),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_user_roles" (
	"admin_user_id" uuid NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "admin_user_roles_admin_user_id_role_id_pk" PRIMARY KEY("admin_user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"avatar_media_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"admin_user_id" uuid,
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" varchar(60),
	"diff" jsonb,
	"ip" varchar(60),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(60) NOT NULL,
	"description" text,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(60) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "article_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "article_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "article_related" (
	"article_id" uuid NOT NULL,
	"related_article_id" uuid NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "article_related_article_id_related_article_id_pk" PRIMARY KEY("article_id","related_article_id")
);
--> statement-breakpoint
CREATE TABLE "article_tags" (
	"article_id" uuid NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "article_tags_article_id_tag_id_pk" PRIMARY KEY("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(255) NOT NULL,
	"standfirst" text,
	"hero_media_id" uuid,
	"category_id" integer,
	"body" jsonb,
	"body_html" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone,
	"author_id" uuid,
	"author_name_override" varchar(120),
	"is_breaking" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"type" "block_type" NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "galleries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "galleries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gallery_items" (
	"gallery_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"caption_override" text,
	CONSTRAINT "gallery_items_gallery_id_media_id_pk" PRIMARY KEY("gallery_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "media_kind" DEFAULT 'image' NOT NULL,
	"path" text NOT NULL,
	"filename" varchar(255) NOT NULL,
	"mime" varchar(120) NOT NULL,
	"width" integer,
	"height" integer,
	"size_bytes" integer,
	"alt" text,
	"caption" text,
	"credit" varchar(255),
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(255) NOT NULL,
	"meta_title" varchar(255),
	"meta_description" text,
	"og_media_id" uuid,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"tier" "sponsor_tier" DEFAULT 'official_partner' NOT NULL,
	"logo_media_id" uuid,
	"url" varchar(500),
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "video_tags" (
	"video_id" uuid NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "video_tags_video_id_tag_id_pk" PRIMARY KEY("video_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"provider" "video_provider" DEFAULT 'youtube' NOT NULL,
	"external_id" varchar(120),
	"media_id" uuid,
	"thumbnail_media_id" uuid,
	"duration_seconds" integer,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "videos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
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
CREATE TABLE "circuits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(200) NOT NULL,
	"official_name" varchar(255),
	"locality" varchar(120),
	"country" varchar(120) NOT NULL,
	"country_code" char(2),
	"length_km" real,
	"race_laps" integer,
	"lap_record_time_ms" integer,
	"lap_record_driver" varchar(120),
	"lap_record_year" integer,
	"first_gp_year" integer,
	"description" text,
	"map_media_id" uuid,
	CONSTRAINT "circuits_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "constructor_standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_year" integer NOT NULL,
	"team_season_entry_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"points" real DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"computed_through_round" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "constructor_standings_uq" UNIQUE("season_year","team_season_entry_id")
);
--> statement-breakpoint
CREATE TABLE "driver_season_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"team_season_entry_id" uuid NOT NULL,
	"season_year" integer NOT NULL,
	"car_number" integer NOT NULL,
	"role" "driver_role" DEFAULT 'primary' NOT NULL,
	"from_round" integer,
	"to_round" integer,
	CONSTRAINT "driver_entry_uq" UNIQUE("driver_id","team_season_entry_id","from_round")
);
--> statement-breakpoint
CREATE TABLE "driver_standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_year" integer NOT NULL,
	"driver_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"points" real DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"podiums" integer DEFAULT 0 NOT NULL,
	"poles" integer DEFAULT 0 NOT NULL,
	"computed_through_round" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "driver_standings_uq" UNIQUE("season_year","driver_id")
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"code" char(3) NOT NULL,
	"country_code" char(2),
	"date_of_birth" date,
	"place_of_birth" varchar(200),
	"biography" text,
	"headshot_media_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "drivers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "grands_prix" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_year" integer NOT NULL,
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
	CONSTRAINT "gp_season_round_uq" UNIQUE("season_year","round"),
	CONSTRAINT "gp_season_slug_uq" UNIQUE("season_year","slug")
);
--> statement-breakpoint
CREATE TABLE "race_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grand_prix_id" uuid NOT NULL,
	"type" "session_type" NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" "session_status" DEFAULT 'scheduled' NOT NULL,
	CONSTRAINT "session_gp_type_uq" UNIQUE("grand_prix_id","type")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"year" integer PRIMARY KEY NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"race_points" integer[] NOT NULL,
	"sprint_points" integer[] NOT NULL,
	"fastest_lap_point" boolean DEFAULT false NOT NULL
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
	"season_year" integer NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"short_name" varchar(60) NOT NULL,
	"primary_color" varchar(7) DEFAULT '#67676d' NOT NULL,
	"secondary_color" varchar(7),
	"team_principal" varchar(120),
	"power_unit_supplier" varchar(120),
	"logo_media_id" uuid,
	"car_image_media_id" uuid,
	CONSTRAINT "team_season_uq" UNIQUE("team_id","season_year")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"full_name" varchar(200),
	"base" varchar(200),
	"country_code" char(2),
	"first_entry_year" integer,
	"world_championships" integer DEFAULT 0 NOT NULL,
	"description" text,
	"logo_media_id" uuid,
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "fan_favourites" (
	"fan_id" uuid NOT NULL,
	"entity_type" "favourite_entity" NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fan_favourites_fan_id_entity_type_entity_id_pk" PRIMARY KEY("fan_id","entity_type","entity_id")
);
--> statement-breakpoint
CREATE TABLE "fan_sessions" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"fan_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"country_code" char(2),
	"deactivated_at" timestamp with time zone,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fans_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"fan_id" uuid,
	"status" "subscriber_status" DEFAULT 'pending' NOT NULL,
	"confirm_token" varchar(64),
	"confirmed_at" timestamp with time zone,
	"source" varchar(60),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"label" varchar(255) NOT NULL,
	"driver_id" uuid,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"poll_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_votes_poll_id_fan_id_pk" PRIMARY KEY("poll_id","fan_id")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"question" varchar(500) NOT NULL,
	"kind" "poll_kind" DEFAULT 'poll' NOT NULL,
	"grand_prix_id" uuid,
	"status" "poll_status" DEFAULT 'draft' NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "polls_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "saved_articles" (
	"fan_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_articles_fan_id_article_id_pk" PRIMARY KEY("fan_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" varchar(120) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_related" ADD CONSTRAINT "article_related_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_related" ADD CONSTRAINT "article_related_related_article_id_articles_id_fk" FOREIGN KEY ("related_article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_article_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."article_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_admin_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_gallery_id_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_admin_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_og_media_id_media_id_fk" FOREIGN KEY ("og_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_tags" ADD CONSTRAINT "video_tags_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_tags" ADD CONSTRAINT "video_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_thumbnail_media_id_media_id_fk" FOREIGN KEY ("thumbnail_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_team_season_entry_id_team_season_entries_id_fk" FOREIGN KEY ("team_season_entry_id") REFERENCES "public"."team_season_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuits" ADD CONSTRAINT "circuits_map_media_id_media_id_fk" FOREIGN KEY ("map_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_season_year_seasons_year_fk" FOREIGN KEY ("season_year") REFERENCES "public"."seasons"("year") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_team_season_entry_id_team_season_entries_id_fk" FOREIGN KEY ("team_season_entry_id") REFERENCES "public"."team_season_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_season_entries" ADD CONSTRAINT "driver_season_entries_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_season_entries" ADD CONSTRAINT "driver_season_entries_team_season_entry_id_team_season_entries_id_fk" FOREIGN KEY ("team_season_entry_id") REFERENCES "public"."team_season_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_season_entries" ADD CONSTRAINT "driver_season_entries_season_year_seasons_year_fk" FOREIGN KEY ("season_year") REFERENCES "public"."seasons"("year") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_season_year_seasons_year_fk" FOREIGN KEY ("season_year") REFERENCES "public"."seasons"("year") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_headshot_media_id_media_id_fk" FOREIGN KEY ("headshot_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grands_prix" ADD CONSTRAINT "grands_prix_season_year_seasons_year_fk" FOREIGN KEY ("season_year") REFERENCES "public"."seasons"("year") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grands_prix" ADD CONSTRAINT "grands_prix_circuit_id_circuits_id_fk" FOREIGN KEY ("circuit_id") REFERENCES "public"."circuits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grands_prix" ADD CONSTRAINT "grands_prix_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_sessions" ADD CONSTRAINT "race_sessions_grand_prix_id_grands_prix_id_fk" FOREIGN KEY ("grand_prix_id") REFERENCES "public"."grands_prix"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_session_id_race_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."race_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_driver_season_entry_id_driver_season_entries_id_fk" FOREIGN KEY ("driver_season_entry_id") REFERENCES "public"."driver_season_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_season_entries" ADD CONSTRAINT "team_season_entries_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_season_entries" ADD CONSTRAINT "team_season_entries_season_year_seasons_year_fk" FOREIGN KEY ("season_year") REFERENCES "public"."seasons"("year") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_season_entries" ADD CONSTRAINT "team_season_entries_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_season_entries" ADD CONSTRAINT "team_season_entries_car_image_media_id_media_id_fk" FOREIGN KEY ("car_image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_logo_media_id_media_id_fk" FOREIGN KEY ("logo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_favourites" ADD CONSTRAINT "fan_favourites_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_sessions" ADD CONSTRAINT "fan_sessions_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_option_id_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_grand_prix_id_grands_prix_id_fk" FOREIGN KEY ("grand_prix_id") REFERENCES "public"."grands_prix"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_articles" ADD CONSTRAINT "saved_articles_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_articles" ADD CONSTRAINT "saved_articles_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_sessions_user_idx" ON "admin_sessions" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "articles_status_published_idx" ON "articles" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "blocks_page_idx" ON "content_blocks" USING btree ("page_id","sort");--> statement-breakpoint
CREATE INDEX "media_created_idx" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "videos_status_idx" ON "videos" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "driver_entries_season_idx" ON "driver_season_entries" USING btree ("season_year");--> statement-breakpoint
CREATE INDEX "results_session_idx" ON "session_results" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "results_entry_idx" ON "session_results" USING btree ("driver_season_entry_id");--> statement-breakpoint
CREATE INDEX "fan_sessions_fan_idx" ON "fan_sessions" USING btree ("fan_id");