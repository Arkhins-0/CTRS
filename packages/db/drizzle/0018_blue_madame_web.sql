CREATE TABLE "media_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" varchar(300) NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_folders_path_unique" UNIQUE("path")
);
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "folder" varchar(300) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_folders_path_idx" ON "media_folders" USING btree ("path");--> statement-breakpoint
CREATE INDEX "media_folder_idx" ON "media" USING btree ("folder");