import { notFound } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { format } from "date-fns";
import { z } from "zod";
import {
  articleCategories,
  articleRelated,
  articles,
  db,
  PERMISSIONS,
  tags,
} from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { MediaPickerInput } from "@/components/media/media-picker";
import { Card, Field, Input, PageHeader, Select, StatusPill, Textarea } from "@/components/ui";
import { ConfirmSubmit, IntentSubmitButton, SubmitButton } from "@/components/ui-client";
import { deleteArticleAction, saveArticleAction } from "../actions";
import { RelatedPicker } from "../related-picker";

export const dynamic = "force-dynamic";

export default async function ArticleEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.NEWS_MANAGE);
  const [{ id }, { saved, error }] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();

  const [article, categories, allTags, related, published] = await Promise.all([
    db.query.articles.findFirst({
      where: eq(articles.id, id),
      with: { hero: true, articleTags: true, author: true },
    }),
    db.select().from(articleCategories).orderBy(articleCategories.sort, articleCategories.name),
    db.select().from(tags).orderBy(tags.name),
    db
      .select({ id: articleRelated.relatedArticleId, title: articles.title })
      .from(articleRelated)
      .innerJoin(articles, eq(articles.id, articleRelated.relatedArticleId))
      .where(eq(articleRelated.articleId, id))
      .orderBy(articleRelated.sort),
    db
      .select({ id: articles.id, title: articles.title })
      .from(articles)
      .where(and(ne(articles.id, id), eq(articles.status, "published")))
      .orderBy(desc(articles.publishedAt))
      .limit(500),
  ]);
  if (!article) notFound();

  const selectedTagIds = new Set(article.articleTags.map((at) => at.tagId));
  const heroThumb = article.hero ? publicUrl(variantKey(article.hero.path, "thumb")) : null;
  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");

  return (
    <>
      <PageHeader
        title="Edit article"
        sub={`Created ${format(article.createdAt, "d MMM yyyy")} · last updated ${format(article.updatedAt, "d MMM yyyy HH:mm")}`}
      />

      {saved ? (
        <p className="mb-4 border border-emerald-600 bg-surface p-3 text-sm font-bold text-emerald-700">
          Article saved.
        </p>
      ) : null}
      {error === "invalid" ? (
        <p className="mb-4 border border-f1-red bg-surface p-3 text-sm font-bold text-f1-red">
          The article could not be saved — check that the title is filled in.
        </p>
      ) : null}
      {error === "schedule-date" ? (
        <p className="mb-4 border border-f1-red bg-surface p-3 text-sm font-bold text-f1-red">
          Pick a date and time before scheduling.
        </p>
      ) : null}

      <form
        action={saveArticleAction}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
      >
        <input type="hidden" name="id" value={article.id} />

        {/* ── Left column: the story ─────────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <Field label="Title">
              <Input
                name="title"
                defaultValue={article.title}
                required
                maxLength={255}
                className="!text-xl font-black"
              />
            </Field>
            <div className="mt-3">
              <Field label="Slug" hint="Leave empty to regenerate from the title. Clashes get -2, -3…">
                <Input name="slug" defaultValue={article.slug} maxLength={200} className="font-mono" />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Standfirst" hint="Short intro shown under the headline and in cards.">
                <Textarea name="standfirst" defaultValue={article.standfirst ?? ""} maxLength={5000} />
              </Field>
            </div>
          </Card>

          <Card>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-fg-muted">
              Body
            </span>
            <RichTextEditor
              name="body"
              initialContent={
                (article.body as Record<string, unknown> | null) ?? article.bodyHtml ?? ""
              }
            />
          </Card>
        </div>

        {/* ── Right column: publishing & metadata ────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide">Status</h2>
              <StatusPill status={article.status} />
            </div>
            {article.status === "published" && article.publishedAt ? (
              <p className="mt-1 text-xs text-fg-muted">
                Published {format(article.publishedAt, "d MMM yyyy HH:mm")}
              </p>
            ) : null}
            {article.status === "scheduled" && article.scheduledFor ? (
              <p className="mt-1 text-xs text-fg-muted">
                Goes live {format(article.scheduledFor, "d MMM yyyy HH:mm")}
              </p>
            ) : null}
            {article.status === "published" ? (
              <a
                href={`${siteUrl}/latest/article/${article.slug}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs font-bold uppercase text-f1-red hover:underline"
              >
                View on site →
              </a>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              <IntentSubmitButton intent="save" variant="secondary">
                {article.status === "draft" ? "Save draft" : "Save changes"}
              </IntentSubmitButton>
              {article.status !== "published" ? (
                <IntentSubmitButton intent="publish">
                  Publish now
                </IntentSubmitButton>
              ) : null}
              <div className="border-t border-line pt-3">
                <Field label="Schedule for">
                  <Input
                    type="datetime-local"
                    name="scheduledFor"
                    defaultValue={
                      article.scheduledFor ? format(article.scheduledFor, "yyyy-MM-dd'T'HH:mm") : ""
                    }
                  />
                </Field>
                <IntentSubmitButton intent="schedule" variant="secondary" className="mt-2 w-full">
                  Schedule
                </IntentSubmitButton>
              </div>
              {article.status === "published" || article.status === "scheduled" ? (
                <IntentSubmitButton intent="unpublish" variant="danger">
                  Unpublish → draft
                </IntentSubmitButton>
              ) : null}
              {article.status !== "archived" ? (
                <IntentSubmitButton intent="archive" variant="danger">
                  Archive
                </IntentSubmitButton>
              ) : null}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Metadata</h2>
            <Field label="Category">
              <Select name="categoryId" defaultValue={article.categoryId ?? ""}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="mt-3">
              <Field
                label="Author display override"
                hint={`Defaults to ${article.author?.displayName ?? "the author account"}.`}
              >
                <Input
                  name="authorNameOverride"
                  defaultValue={article.authorNameOverride ?? ""}
                  maxLength={120}
                />
              </Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                name="isBreaking"
                defaultChecked={article.isBreaking}
                className="h-4 w-4 accent-f1-red"
              />
              Breaking news
            </label>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Hero image</h2>
            <MediaPickerInput
              defaultFolder="news"
              name="heroMediaId"
              initialId={article.heroMediaId}
              initialUrl={heroThumb}
            />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Tags</h2>
            {allTags.length > 0 ? (
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {allTags.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="tagIds"
                      value={t.id}
                      defaultChecked={selectedTagIds.has(t.id)}
                      className="h-4 w-4 accent-f1-red"
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-fg-muted">No tags yet.</p>
            )}
            <div className="mt-3">
              <Field label="New tags" hint="Comma separated — created on save.">
                <Input name="newTags" placeholder="e.g. Silverstone, Pit stops" />
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Related articles</h2>
            <RelatedPicker options={published} initial={related} />
          </Card>
        </div>
      </form>

      <div className="mt-8 flex justify-end border-t border-line pt-4">
        <form action={deleteArticleAction}>
          <input type="hidden" name="id" value={article.id} />
          <ConfirmSubmit message="Delete this article? Tags and related links are removed too. This cannot be undone.">
            Delete article
          </ConfirmSubmit>
        </form>
      </div>
    </>
  );
}
