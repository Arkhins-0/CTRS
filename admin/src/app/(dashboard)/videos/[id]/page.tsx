import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { z } from "zod";
import { db, PERMISSIONS, videos } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { PageHeader } from "@/components/ui";
import { ConfirmSubmit } from "@/components/ui-client";
import { deleteVideoAction } from "../actions";
import { VideoForm } from "../video-form";

export const dynamic = "force-dynamic";

export default async function VideoEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.VIDEOS_MANAGE);
  const [{ id }, { saved, error }] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();

  const video = await db.query.videos.findFirst({
    where: eq(videos.id, id),
    with: { file: true, thumbnail: true },
  });
  if (!video) notFound();

  const fileThumbUrl = video.file ? publicUrl(variantKey(video.file.path, "thumb")) : null;
  const thumbnailThumbUrl = video.thumbnail
    ? publicUrl(variantKey(video.thumbnail.path, "thumb"))
    : null;

  return (
    <>
      <PageHeader
        title="Edit video"
        sub={`Created ${format(video.createdAt, "d MMM yyyy HH:mm")}`}
      />

      {saved ? (
        <p className="mb-4 border border-emerald-600 bg-surface p-3 text-sm font-bold text-emerald-700">
          Video saved.
        </p>
      ) : null}
      {error === "invalid" ? (
        <p className="mb-4 border border-f1-red bg-surface p-3 text-sm font-bold text-f1-red">
          The video could not be saved — check that the title is filled in.
        </p>
      ) : null}

      <VideoForm video={video} fileThumbUrl={fileThumbUrl} thumbnailThumbUrl={thumbnailThumbUrl} />

      <div className="mt-8 flex justify-end border-t border-line pt-4">
        <form action={deleteVideoAction}>
          <input type="hidden" name="id" value={video.id} />
          <ConfirmSubmit message="Delete this video? This cannot be undone.">
            Delete video
          </ConfirmSubmit>
        </form>
      </div>
    </>
  );
}
