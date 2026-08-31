CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" varchar(500) NOT NULL,
	"url" varchar(300),
	"sent_at" timestamp with time zone,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"fan_id" uuid,
	"user_agent" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_subscriptions_fan_idx" ON "push_subscriptions" USING btree ("fan_id");