import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { z } from "zod";
import { db, galleries, galleryItems, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { MediaPickerInput } from "@/components/media/media-picker";
import { Card, EmptyState, Field, Input, PageHeader, StatusPill, Textarea } from "@/components/ui";
import { ConfirmSubmit, IntentSubmitButton, SubmitButton } from "@/components/ui-client";
import {
  addGalleryItemAction,
  deleteGalleryAction,
  moveGalleryItemAction,
  removeGalleryItemAction,
  saveGalleryAction,
  updateGalleryItemCaptionAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function GalleryEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.VIDEOS_MANAGE);
  const [{ id }, { saved, error }] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();

  const [gallery, items] = await Promise.all([
    db.query.galleries.findFirst({ where: eq(galleries.id, id) }),
    db.query.galleryItems.findMany({
      where: eq(galleryItems.galleryId, id),
      with: { media: true },
      orderBy: [asc(galleryItems.sort), asc(galleryItems.mediaId)],
    }),
  ]);
  if (!gallery) notFound();

  return (
    <>
      <PageHeader
        title="Edit gallery"
        sub={`Created ${format(gallery.createdAt, "d MMM yyyy HH:mm")} · ${items.length} image${items.length === 1 ? "" : "s"}`}
      />

      {saved ? (
        <p className="mb-4 border border-emerald-600 bg-surface p-3 text-sm font-bold text-emerald-700">
          Gallery saved.
        </p>
      ) : null}
      {error === "invalid" ? (
        <p className="mb-4 border border-f1-red bg-surface p-3 text-sm font-bold text-f1-red">
          The gallery could not be saved — check that the title is filled in.
        </p>
      ) : null}
      {error === "pick-image" ? (
        <p className="mb-4 border border-f1-red bg-surface p-3 text-sm font-bold text-f1-red">
          Choose an image before adding it to the gallery.
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Items manager ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Images</h2>
            {items.length === 0 ? (
              <EmptyState title="No images yet" hint="Add the first image below." />
            ) : (
              <div className="divide-y divide-warm-grey">
                {items.map((item, index) => (
                  <div key={item.mediaId} className="flex items-center gap-3 py-3">
                    <span className="w-6 text-center font-black text-fg-muted">{index + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={publicUrl(variantKey(item.media.path, "thumb"))}
                      alt={item.media.alt ?? item.media.filename}
                      className="h-16 w-24 shrink-0 bg-page object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold" title={item.media.filename}>
                        {item.media.filename}
                      </p>
                      <form
                        action={updateGalleryItemCaptionAction}
                        className="mt-1 flex items-center gap-2"
                      >
                        <input type="hidden" name="galleryId" value={gallery.id} />
                        <input type="hidden" name="mediaId" value={item.mediaId} />
                        <Input
                          name="captionOverride"
                          defaultValue={item.captionOverride ?? ""}
                          maxLength={5000}
                          placeholder={item.media.caption ?? "Caption override…"}
                          className="!py-1 text-xs"
                        />
                        <SubmitButton variant="secondary" className="!px-2.5 !py-1 !text-[11px]">
                          Save
                        </SubmitButton>
                      </form>
                    </div>
                    <form action={moveGalleryItemAction} className="flex flex-col gap-1">
                      <input type="hidden" name="galleryId" value={gallery.id} />
                      <input type="hidden" name="mediaId" value={item.mediaId} />
                      <button
                        name="dir"
                        value="up"
                        disabled={index === 0}
                        aria-label="Move up"
                        className="border border-line bg-surface px-2 py-0.5 text-xs font-bold hover:border-fg-faint disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        name="dir"
                        value="down"
                        disabled={index === items.length - 1}
                        aria-label="Move down"
                        className="border border-line bg-surface px-2 py-0.5 text-xs font-bold hover:border-fg-faint disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </form>
                    <form action={removeGalleryItemAction}>
                      <input type="hidden" name="galleryId" value={gallery.id} />
                      <input type="hidden" name="mediaId" value={item.mediaId} />
                      <ConfirmSubmit message="Remove this image from the gallery? The media file itself is kept.">
                        Remove
                      </ConfirmSubmit>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-2 text-sm font-black uppercase tracking-wide">Add image</h2>
            <form action={addGalleryItemAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="galleryId" value={gallery.id} />
              <MediaPickerInput defaultFolder="galleries" name="mediaId" label="Choose image" />
              <SubmitButton>Add to gallery</SubmitButton>
            </form>
          </Card>
        </div>

        {/* ── Meta & publishing ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <form action={saveGalleryAction}>
            <input type="hidden" name="id" value={gallery.id} />
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wide">Details</h2>
                <StatusPill status={gallery.status} />
              </div>
              {gallery.publishedAt ? (
                <p className="mt-1 text-xs text-fg-muted">
                  Published {format(gallery.publishedAt, "d MMM yyyy HH:mm")}
                </p>
              ) : null}
              <div className="mt-3 space-y-3">
                <Field label="Title">
                  <Input name="title" defaultValue={gallery.title} required maxLength={255} />
                </Field>
                <Field label="Slug" hint="Leave empty to generate from the title.">
                  <Input name="slug" defaultValue={gallery.slug} maxLength={200} className="font-mono" />
                </Field>
                <Field label="Description">
                  <Textarea name="description" defaultValue={gallery.description ?? ""} maxLength={10000} />
                </Field>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <IntentSubmitButton intent="save" variant="secondary">
                  Save changes
                </IntentSubmitButton>
                {gallery.status !== "published" ? (
                  <IntentSubmitButton intent="publish">
                    Publish now
                  </IntentSubmitButton>
                ) : null}
                {gallery.status === "published" || gallery.status === "scheduled" ? (
                  <IntentSubmitButton intent="unpublish" variant="danger">
                    Unpublish → draft
                  </IntentSubmitButton>
                ) : null}
                {gallery.status !== "archived" ? (
                  <IntentSubmitButton intent="archive" variant="danger">
                    Archive
                  </IntentSubmitButton>
                ) : null}
              </div>
            </Card>
          </form>

          <Card className="border-f1-red">
            <h2 className="text-sm font-black uppercase tracking-wide text-f1-red">Danger zone</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Deletes the gallery and its item list — the media files themselves are kept.
            </p>
            <form action={deleteGalleryAction} className="mt-3">
              <input type="hidden" name="id" value={gallery.id} />
              <ConfirmSubmit message="Delete this gallery? This cannot be undone.">
                Delete gallery
              </ConfirmSubmit>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
