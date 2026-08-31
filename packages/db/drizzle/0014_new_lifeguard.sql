CREATE TYPE "public"."newsletter_issue_kind" AS ENUM('digest', 'broadcast');--> statement-breakpoint
CREATE TYPE "public"."newsletter_issue_status" AS ENUM('draft', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "newsletter_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "newsletter_issue_kind" NOT NULL,
	"subject" varchar(200) NOT NULL,
	"body_json" text,
	"sent_html" text,
	"period_key" varchar(20),
	"status" "newsletter_issue_status" DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp with time zone,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN "unsubscribe_token" varchar(64);--> statement-breakpoint
ALTER TABLE "newsletter_issues" ADD CONSTRAINT "newsletter_issues_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_issues_period_key_uq" ON "newsletter_issues" USING btree ("period_key") WHERE "newsletter_issues"."kind" = 'digest' AND "newsletter_issues"."period_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "newsletter_issues_created_idx" ON "newsletter_issues" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_unsubscribe_token_unique" UNIQUE("unsubscribe_token");