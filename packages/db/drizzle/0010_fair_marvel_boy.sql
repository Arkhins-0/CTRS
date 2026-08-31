CREATE TYPE "public"."admin_token_type" AS ENUM('password_reset', 'email_change');--> statement-breakpoint
CREATE TABLE "admin_notification_prefs" (
	"admin_user_id" uuid PRIMARY KEY NOT NULL,
	"announcements" boolean DEFAULT true NOT NULL,
	"race_ops" boolean DEFAULT true NOT NULL,
	"results_reminders" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_verification_tokens" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"type" "admin_token_type" NOT NULL,
	"new_email" varchar(255),
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" varchar(200) NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limit_buckets_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
ALTER TABLE "admin_notification_prefs" ADD CONSTRAINT "admin_notification_prefs_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_verification_tokens" ADD CONSTRAINT "admin_verification_tokens_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_verification_tokens_user_idx" ON "admin_verification_tokens" USING btree ("admin_user_id","type");--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_expiry_idx" ON "rate_limit_buckets" USING btree ("expires_at");