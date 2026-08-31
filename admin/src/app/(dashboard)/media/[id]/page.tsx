import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { z } from "zod";
import { db, media, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey, MEDIA_VARIANTS } from "@/components/media/variants";
import { Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { deleteMediaAction, updateMediaAction } from "../actions";
import { findMediaUsage } from "../usage";

export const dynamic = "force-dynamic";

export default async function MediaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requirePermission(PERMISSIONS.MEDIA_MANAGE);
  const [{ id }, { error, saved }] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();

  const row = await db.query.media.findFirst({
    where: eq(media.id, id),
    with: { uploader: true },
  });
  if (!row) notFound();

  const usage = await findMediaUsage(id);

  return (
    <>
      <PageHeader
        title={row.filename}
        sub={`Uploaded ${format(row.createdAt, "d MMM yyyy HH:mm")}${row.uploader ? ` by ${row.uploader.displayName}` : ""}`}
      />

      {error === "in-use" ? (
        <p className="mb-4 border border-f1-red bg-surface p-3 text-sm font-bold text-f1-red">
          This file can’t be deleted while it is referenced — remove it from the entries listed
          under “Where is this used?” first.
        </p>
      ) : null}
      {saved ? (
        <p className="mb-4 border border-emerald-600 bg-surface p-3 text-sm font-bold text-emerald-700">
          Details saved.
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicUrl(row.path)}
              alt={row.alt ?? row.filename}
              className="mx-auto max-h-[520px] w-auto max-w-full bg-page object-contain"
            />
          </Card>

          <Card>
            <h2 className="text-sm font-black uppercase tracking-wide">Where is this used?</h2>
            {usage.length === 0 ? (
              <p className="mt-2 text-sm text-fg-muted">
                Not referenced anywhere — safe to delete.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-warm-grey">
                {usage.map((u, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      <span className="mr-2 inline-block bg-panel px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-fg">
                        {u.type}
                      </span>
                      {u.name}
                    </span>
                    <Link
                      href={u.href}
                      className="whitespace-nowrap text-xs font-bold uppercase text-f1-red hover:underline"
                    >
                      Open →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Details</h2>
            <form action={updateMediaAction} className="space-y-3">
              <input type="hidden" name="id" value={row.id} />
              <Field label="Alt text" hint="Describes the image for screen readers and SEO.">
                <Input name="alt" defaultValue={row.alt ?? ""} maxLength={2000} />
              </Field>
              <Field label="Caption">
                <Textarea name="caption" defaultValue={row.caption ?? ""} maxLength={5000} />
              </Field>
              <Field label="Credit">
                <Input name="credit" defaultValue={row.credit ?? ""} maxLength={255} />
              </Field>
              <SubmitButton>Save details</SubmitButton>
            </form>
          </Card>

          <Card>
            <h2 className="text-sm font-black uppercase tracking-wide">File info</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <InfoRow label="Kind" value={row.kind} />
              <InfoRow label="MIME" value={row.mime} />
              <InfoRow
                label="Dimensions"
                value={row.width && row.height ? `${row.width} × ${row.height}px` : "—"}
              />
              <InfoRow
                label="Size"
                value={row.sizeBytes ? `${Math.max(1, Math.round(row.sizeBytes / 1024))} KB` : "—"}
              />
              <InfoRow label="Key" value={row.path} mono />
            </dl>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-fg-muted">Renditions</p>
            <ul className="mt-1 space-y-1 text-xs">
              {MEDIA_VARIANTS.map((v) => (
                <li key={v}>
                  <a
                    href={publicUrl(variantKey(row.path, v))}
                    target="_blank"
                    rel="noreferrer"
                    className="text-f1-red hover:underline"
                  >
                    {v} →
                  </a>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-f1-red">
            <h2 className="text-sm font-black uppercase tracking-wide text-f1-red">Danger zone</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Deletes the file and all renditions from storage. Refused while referenced.
            </p>
            <form action={deleteMediaAction} className="mt-3">
              <input type="hidden" name="id" value={row.id} />
              <ConfirmSubmit message="Delete this media file and its renditions? This cannot be undone.">
                Delete file
              </ConfirmSubmit>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs font-bold uppercase tracking-wide text-fg-muted">{label}</dt>
      <dd className={`truncate text-right ${mono ? "font-mono text-xs" : ""}`} title={value}>
        {value}
      </dd>
    </div>
  );
}
