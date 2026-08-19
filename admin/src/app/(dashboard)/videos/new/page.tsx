import { PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { VideoForm } from "../video-form";

export const dynamic = "force-dynamic";

export default async function NewVideoPage() {
  await requirePermission(PERMISSIONS.VIDEOS_MANAGE);

  return (
    <>
      <PageHeader title="New video" sub="Link a YouTube video or attach an uploaded file" />
      <VideoForm />
    </>
  );
}
