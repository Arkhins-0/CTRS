import { notFound } from "next/navigation";
import { format } from "date-fns";
import { asc, eq, inArray } from "drizzle-orm";
import { contentBlocks, db, media, pages, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { MediaPickerInput } from "@/components/media/media-picker";
import { Card, Field, Input, PageHeader, Select, StatusPill, Textarea } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import {
  addBlockAction,
  deleteBlockAction,
  deletePageAction,
  moveBlockAction,
  updateBlockAction,
  updatePageMetaAction,
} from "../actions";

export const dynamic = "force-dynamic";

type Block = typeof contentBlocks.$inferSelect;

const BLOCK_LABELS: Record<Block["type"], string> = {
  hero: "Hero",
  rich_text: "Rich text",
  image: "Image",
  image_grid: "Image grid",
  cta: "Call to action",
  faq: "FAQ",
  sponsor_grid: "Sponsor grid",
  raw_html: "Raw HTML",
};

/* ── type-specific block edit forms (server-rendered) ────────────────────── */

function BlockFields({ block, mediaThumb }: { block: Block; mediaThumb?: string | null }) {
  // jsonb — shape depends on block type
  const data = (block.data ?? {}) as any;

  switch (block.type) {
    case "hero":
      return (
        <>
          <Field label="Heading">
            <Input name="heading" defaultValue={data.heading ?? ""} />
          </Field>
          <Field label="Sub">
            <Input name="sub" defaultValue={data.sub ?? ""} />
          </Field>
        </>
      );
    case "rich_text":
      return (
        <Field label="Content" hint="HTML — rendered inside article styling">
          <Textarea name="html" rows={12} className="min-h-56 font-mono" defaultValue={data.html ?? ""} />
        </Field>
      );
    case "image":
      return (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Image" hint="Picked from the media library.">
              <MediaPickerInput
                name="mediaId"
                initialId={typeof data.mediaId === "string" ? data.mediaId : null}
                initialUrl={mediaThumb}
              />
            </Field>
            <Field label="External URL" hint="Used when no library image is set">
              <Input name="url" defaultValue={data.url ?? ""} placeholder="https://…" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Alt text">
              <Input name="alt" defaultValue={data.alt ?? ""} />
            </Field>
            <Field label="Caption">
              <Input name="caption" defaultValue={data.caption ?? ""} />
            </Field>
          </div>
        </>
      );
    case "image_grid": {
      const lines = ((data.items ?? []) as { url?: string; caption?: string }[])
        .map((i) => (i.caption ? `${i.url ?? ""} | ${i.caption}` : (i.url ?? "")))
        .join("\n");
      return (
        <Field label="Images" hint="One image per line: url | caption">
          <Textarea name="items" rows={6} className="font-mono" defaultValue={lines} />
        </Field>
      );
    }
    case "cta":
      return (
        <>
          <Field label="Heading">
            <Input name="heading" defaultValue={data.heading ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button label">
              <Input name="buttonLabel" defaultValue={data.buttonLabel ?? ""} />
            </Field>
            <Field label="Link (href)">
              <Input name="href" defaultValue={data.href ?? ""} placeholder="/fan-zone" />
            </Field>
          </div>
        </>
      );
    case "faq": {
      const lines = ((data.items ?? []) as { q?: string; a?: string }[])
        .map((i) => `${i.q ?? ""}::${i.a ?? ""}`)
        .join("\n");
      return (
        <Field label="Questions" hint="One per line: Question?::Answer">
          <Textarea name="items" rows={6} className="font-mono" defaultValue={lines} />
        </Field>
      );
    }
    case "sponsor_grid":
      return (
        <p className="text-sm text-fg-muted">
          This block automatically renders the active sponsors — there is nothing to configure.
          Manage the list under <span className="font-bold">Sponsors</span>.
        </p>
      );
    case "raw_html":
      return (
        <Field label="Raw HTML" hint="Inserted verbatim — use with care">
          <Textarea name="html" rows={10} className="min-h-48 font-mono" defaultValue={data.html ?? ""} />
        </Field>
      );
  }
}

function BlockCard({
  block,
  index,
  total,
  mediaThumb,
}: {
  block: Block;
  index: number;
  total: number;
  mediaThumb?: string | null;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
        <p className="text-xs font-black uppercase tracking-wide">
          <span className="mr-2 inline-block bg-panel px-1.5 py-0.5 text-fg">{index + 1}</span>
          {BLOCK_LABELS[block.type]}
        </p>
        <div className="flex items-center gap-1.5">
          <form action={moveBlockAction}>
            <input type="hidden" name="blockId" value={block.id} />
            <input type="hidden" name="direction" value="up" />
            <button
              disabled={index === 0}
              aria-label="Move block up"
              className="chamfer-tr border border-line bg-surface px-2 py-1 text-xs font-bold text-fg hover:border-fg-faint disabled:cursor-not-allowed disabled:opacity-40"
            >
              ▲
            </button>
          </form>
          <form action={moveBlockAction}>
            <input type="hidden" name="blockId" value={block.id} />
            <input type="hidden" name="direction" value="down" />
            <button
              disabled={index === total - 1}
              aria-label="Move block down"
              className="chamfer-tr border border-line bg-surface px-2 py-1 text-xs font-bold text-fg hover:border-fg-faint disabled:cursor-not-allowed disabled:opacity-40"
            >
              ▼
            </button>
          </form>
          <form action={deleteBlockAction}>
            <input type="hidden" name="blockId" value={block.id} />
            <ConfirmSubmit message="Delete this block? This cannot be undone.">Delete</ConfirmSubmit>
          </form>
        </div>
      </div>

      {block.type === "sponsor_grid" ? (
        <BlockFields block={block} />
      ) : (
        <form action={updateBlockAction} className="space-y-4">
          <input type="hidden" name="blockId" value={block.id} />
          <BlockFields block={block} mediaThumb={mediaThumb} />
          <SubmitButton variant="secondary">Save block</SubmitButton>
        </form>
      )}
    </Card>
  );
}

/* ── page editor ─────────────────────────────────────────────────────────── */

export default async function PageEditor({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const { id } = await params;

  const page = await db.query.pages.findFirst({
    where: eq(pages.id, id),
    with: {
      ogImage: { columns: { path: true } },
      blocks: { orderBy: [asc(contentBlocks.sort), asc(contentBlocks.id)] },
    },
  });
  if (!page) notFound();

  // preview thumbs for image blocks (block data stores only the media id)
  const blockMediaIds = page.blocks
    .map((b) => (b.type === "image" ? (b.data as { mediaId?: unknown } | null)?.mediaId : null))
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  const mediaRows = blockMediaIds.length
    ? await db
        .select({ id: media.id, path: media.path })
        .from(media)
        .where(inArray(media.id, blockMediaIds))
    : [];
  const thumbById = new Map(mediaRows.map((m) => [m.id, publicUrl(variantKey(m.path, "thumb"))]));
  const blockThumb = (b: (typeof page.blocks)[number]) => {
    if (b.type !== "image") return null;
    const mediaId = (b.data as { mediaId?: unknown } | null)?.mediaId;
    return typeof mediaId === "string" ? (thumbById.get(mediaId) ?? null) : null;
  };

  const ogThumb = page.ogImage ? publicUrl(variantKey(page.ogImage.path, "thumb")) : null;

  return (
    <>
      <PageHeader
        title={page.title}
        sub={`/${page.slug} · updated ${format(page.updatedAt, "d MMM yyyy HH:mm")}`}
        actions={<StatusPill status={page.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Blocks column */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-sm font-black uppercase tracking-wide">Content blocks</h2>
          {page.blocks.length ? (
            page.blocks.map((block, i) => (
              <BlockCard
                key={block.id}
                block={block}
                index={i}
                total={page.blocks.length}
                mediaThumb={blockThumb(block)}
              />
            ))
          ) : (
            <p className="text-sm text-fg-muted">No blocks yet — add the first one below.</p>
          )}

          <Card>
            <form action={addBlockAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="pageId" value={page.id} />
              <Field label="Add block" className="min-w-48 flex-1">
                <Select name="type" defaultValue="rich_text">
                  {Object.entries(BLOCK_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton>Add block</SubmitButton>
            </form>
          </Card>
        </div>

        {/* Meta column */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Page settings</h2>
            <form action={updatePageMetaAction} className="space-y-4">
              <input type="hidden" name="pageId" value={page.id} />
              <Field label="Title">
                <Input name="title" required maxLength={255} defaultValue={page.title} />
              </Field>
              <Field label="Slug" hint="Changing this changes the public URL.">
                <Input name="slug" required pattern="[a-z0-9-]+" maxLength={120} defaultValue={page.slug} />
              </Field>
              <Field label="Meta title">
                <Input name="metaTitle" maxLength={255} defaultValue={page.metaTitle ?? ""} />
              </Field>
              <Field label="Meta description">
                <Textarea name="metaDescription" rows={3} defaultValue={page.metaDescription ?? ""} />
              </Field>
              <Field label="OG image" hint="Social-share preview image.">
                <MediaPickerInput name="ogMediaId" initialId={page.ogMediaId} initialUrl={ogThumb} />
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={page.status === "published" ? "published" : "draft"}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Select>
              </Field>
              <SubmitButton>Save settings</SubmitButton>
            </form>
          </Card>

          <Card className="border-f1-red/40">
            <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-f1-red">Danger zone</h2>
            <p className="mb-3 text-sm text-fg-muted">
              Deleting a page removes it and all of its blocks from the public site immediately.
            </p>
            <form action={deletePageAction}>
              <input type="hidden" name="pageId" value={page.id} />
              <ConfirmSubmit message={`Delete "${page.title}" and all its blocks? This cannot be undone.`}>
                Delete page
              </ConfirmSubmit>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
