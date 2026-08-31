CREATE TABLE "member_password_reset_tokens" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"member_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_password_reset_tokens" ADD CONSTRAINT "member_password_reset_tokens_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_password_reset_tokens_member_idx" ON "member_password_reset_tokens" USING btree ("member_id");