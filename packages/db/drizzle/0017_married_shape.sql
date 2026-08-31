CREATE TABLE "fan_password_reset_tokens" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"fan_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fan_password_reset_tokens" ADD CONSTRAINT "fan_password_reset_tokens_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fan_password_reset_tokens_fan_idx" ON "fan_password_reset_tokens" USING btree ("fan_id");