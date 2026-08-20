ALTER TABLE "circuits" ADD COLUMN "turns" integer;--> statement-breakpoint
ALTER TABLE "circuits" ADD COLUMN "direction" varchar(20);--> statement-breakpoint
ALTER TABLE "circuits" ADD COLUMN "fia_grade" varchar(10);--> statement-breakpoint
ALTER TABLE "circuits" ADD COLUMN "owner" varchar(200);--> statement-breakpoint
ALTER TABLE "circuits" ADD COLUMN "website" varchar(300);--> statement-breakpoint
ALTER TABLE "circuits" ADD COLUMN "photo_media_id" uuid;--> statement-breakpoint
ALTER TABLE "circuits" ADD CONSTRAINT "circuits_photo_media_id_media_id_fk" FOREIGN KEY ("photo_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;