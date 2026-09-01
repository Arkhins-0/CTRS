import { format } from "date-fns";
import type { media, videos } from "@ctr/db";
import { Card, Field, Input, StatusPill, Textarea } from "@/components/ui";
import { IntentSubmitButton, SubmitButton } from "@/components/ui-client";
import { MediaPickerInput } from "@/components/media/media-picker";
import { saveVideoAction } from "./actions";
import { VideoSourceFields } from "./video-source-fields";

type VideoRow = typeof videos.$inferSelect & {
  file?: typeof media.$inferSelect | null;
  thumbnail?: typeof media.$inferSelect | null;
};

/**
 * Shared create/edit form (server component) — /videos/new renders it without
 * a video, /videos/[id] with one. Thumb URLs are precomputed by the caller
 * (client components can't call publicUrl).
 */
export function VideoForm({
  video,
  fileThumbUrl,
  thumbnailThumbUrl,
}: {
  video?: VideoRow;
  fileThumbUrl?: string | null;
  thumbnailThumbUrl?: string | null;
}) {
  const status = video?.status ?? "draft";

  return (
    <form
      action={saveVideoAction}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <input type="hidden" name="id" value={video?.id ?? ""} />

      <div className="space-y-4">
        <Card>
          <Field label="Title">
            <Input
              name="title"
              defaultValue={video?.title ?? ""}
              required
              maxLength={255}
              className="!text-lg font-black"
            />
          </Field>
          <div className="mt-3">
            <Field label="Slug" hint="Leave empty to generate from the title.">
              <Input name="slug" defaultValue={video?.slug ?? ""} maxLength={200} className="font-mono" />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Description">
              <Textarea name="description" defaultValue={video?.description ?? ""} maxLength={10000} />
            </Field>
          </div>
          <div className="mt-3 max-w-48">
            <Field label="Duration (seconds)">
              <Input
                type="number"
                name="durationSeconds"
                min={1}
                defaultValue={video?.durationSeconds ?? ""}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Source</h2>
          <VideoSourceFields
            initialProvider={video?.provider ?? "youtube"}
            initialExternalId={video?.externalId ?? ""}
            fileInitialId={video?.mediaId}
            fileInitialUrl={fileThumbUrl}
          />
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wide">Status</h2>
            <StatusPill status={status} />
          </div>
          {video?.publishedAt ? (
            <p className="mt-1 text-xs text-fg-muted">
              Published {format(video.publishedAt, "d MMM yyyy HH:mm")}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2">
            <IntentSubmitButton intent="save" variant="secondary">
              {video ? "Save changes" : "Save draft"}
            </IntentSubmitButton>
            {status !== "published" ? (
              <IntentSubmitButton intent="publish">
                Publish now
              </IntentSubmitButton>
            ) : null}
            {status === "published" || status === "scheduled" ? (
              <IntentSubmitButton intent="unpublish" variant="danger">
                Unpublish → draft
              </IntentSubmitButton>
            ) : null}
            {video && status !== "archived" ? (
              <IntentSubmitButton intent="archive" variant="danger">
                Archive
              </IntentSubmitButton>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Thumbnail</h2>
          <p className="mb-2 text-xs text-fg-muted">
            Optional override — YouTube videos fall back to the YouTube thumbnail.
          </p>
          <MediaPickerInput
            defaultFolder="videos"
            name="thumbnailMediaId"
            initialId={video?.thumbnailMediaId}
            initialUrl={thumbnailThumbUrl}
          />
        </Card>
      </div>
    </form>
  );
}
