CREATE TYPE "public"."member_rsvp_status" AS ENUM('going', 'maybe', 'not_going');--> statement-breakpoint
CREATE TABLE "member_round_rsvps" (
	"member_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"status" "member_rsvp_status" NOT NULL,
	"note" varchar(280),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_round_rsvps_member_id_round_id_pk" PRIMARY KEY("member_id","round_id")
);
--> statement-breakpoint
ALTER TABLE "member_round_rsvps" ADD CONSTRAINT "member_round_rsvps_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_round_rsvps" ADD CONSTRAINT "member_round_rsvps_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_round_rsvps_round_idx" ON "member_round_rsvps" USING btree ("round_id");