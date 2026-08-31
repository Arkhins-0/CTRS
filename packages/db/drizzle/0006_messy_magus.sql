CREATE TYPE "public"."rsvp_status" AS ENUM('going', 'maybe', 'not_going');--> statement-breakpoint
CREATE TABLE "round_rsvps" (
	"round_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"status" "rsvp_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "round_rsvps_round_id_fan_id_pk" PRIMARY KEY("round_id","fan_id")
);
--> statement-breakpoint
ALTER TABLE "round_rsvps" ADD CONSTRAINT "round_rsvps_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_rsvps" ADD CONSTRAINT "round_rsvps_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "round_rsvps_round_idx" ON "round_rsvps" USING btree ("round_id");