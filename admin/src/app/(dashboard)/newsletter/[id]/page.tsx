import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { z } from "zod";
import { db, newsletterIssues, PERMISSIONS, siteSettings, sponsors } from "@ctr/db";
import { newsletterBroadcastEmail, type SocialLink, type SponsorLogo } from "@ctr/email";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { emailVariantKey } from "@/components/media/variants";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Card, Field, Input, LinkButton, PageHeader } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { deleteBroadcastDraftAction, saveBroadcastDraftAction, sendBroadcastAction } from "../actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { tone: "ok" | "error"; message: string }> = {
  invalid: { tone: "error", message: "Give the issue a subject before saving." },
  "empty-body": { tone: "error", message: "Write something in the body before sending." },
  "already-sent": { tone: "error", message: "This issue has already been sent — it can't be edited." },
};

async function loadSponsorLogos(): Promise<SponsorLogo[]> {
  const rows = await db.query.sponsors.findMany({
    where: eq(sponsors.isActive, true),
    orderBy: (s, { asc }) => [asc(s.sort)],
    limit: 6,
    columns: { name: true, url: true },
    with: { logo: { columns: { path: true } } },
  });
  return rows
    .filter((s): s is typeof s & { logo: { path: string } } => Boolean(s.logo))
    .map((s) => ({ name: s.name, url: s.url ?? "", logoUrl: publicUrl(emailVariantKey(s.logo.path)) }));
}

export default async function NewsletterIssuePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; sent?: string; failed?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.NEWSLETTER_MANAGE);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();

  const issue = await db.query.newsletterIssues.findFirst({ where: eq(newsletterIssues.id, id) });
  if (!issue) notFound();

  const editionLine =
    issue.kind === "digest"
      ? `WEEKLY DIGEST${issue.sentAt ? ` · ${format(issue.sentAt, "d MMM yyyy")}` : ""}`
      : `SPECIAL BULLETIN${issue.sentAt ? ` · ${format(issue.sentAt, "d MMM yyyy")}` : ` · ${format(issue.createdAt, "d MMM yyyy")}`}`;

  // A digest, or any already-sent broadcast, is a read-only historical record.
  if (issue.status !== "draft") {
    return (
      <>
        <PageHeader
          title={issue.subject}
          sub={
            issue.status === "sending"
              ? "Sending…"
              : `${issue.kind === "digest" ? "Weekly digest" : "Broadcast"} · sent ${issue.sentAt ? format(issue.sentAt, "d MMM yyyy HH:mm") : "—"} · ${issue.sentCount} delivered${issue.failedCount ? `, ${issue.failedCount} failed` : ""}`
          }
          actions={<LinkButton href="/newsletter" variant="ghost">← All newsletter</LinkButton>}
        />
        <Card>
          {issue.sentHtml ? (
            <div className="chamfer-tr overflow-hidden border border-line bg-panel">
              <iframe title={issue.subject} srcDoc={issue.sentHtml} className="h-[85vh] w-full border-0 bg-white" />
            </div>
          ) : (
            <p className="text-sm text-fg-muted">
              {issue.status === "sending" ? "This issue is still being sent." : "No rendered copy was saved for this issue."}
            </p>
          )}
        </Card>
      </>
    );
  }

  const [sponsorLogos, [socialRow]] = await Promise.all([
    loadSponsorLogos(),
    db.select().from(siteSettings).where(eq(siteSettings.key, "social_links")),
  ]);
  const socialLinks = (socialRow?.value as SocialLink[] | undefined) ?? [];
  const previewHtml = issue.bodyHtml
    ? newsletterBroadcastEmail({
        editionLine,
        subject: issue.subject,
        bodyHtml: issue.bodyHtml,
        sponsors: sponsorLogos,
        socialLinks,
        unsubscribeUrl: "#unsubscribe-preview",
      }).html
    : null;

  const banner = sp.error ? STATUS[sp.error] : sp.saved ? { tone: "ok" as const, message: "Draft saved." } : null;

  return (
    <>
      <PageHeader
        title="Compose newsletter"
        sub="A one-off issue, sent immediately to every confirmed subscriber."
        actions={<LinkButton href="/newsletter" variant="ghost">← All newsletter</LinkButton>}
      />

      {banner ? (
        <p
          role="status"
          className={`mb-4 border px-3 py-2 text-sm font-bold ${
            banner.tone === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
              : "border-f1-red/40 bg-f1-red/10 text-red-700"
          }`}
        >
          {banner.message}
        </p>
      ) : null}
      {sp.sent != null ? (
        <p role="status" className="mb-4 border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-700">
          Sent to {sp.sent} subscriber{sp.sent === "1" ? "" : "s"}
          {sp.failed && sp.failed !== "0" ? ` — ${sp.failed} could not be delivered.` : "."}
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <form action={saveBroadcastDraftAction} id="broadcast-form">
          <input type="hidden" name="id" value={issue.id} />
          <Card className="space-y-4">
            <Field label="Subject" hint="This is what shows in the recipient's inbox.">
              <Input name="subject" defaultValue={issue.subject === "Untitled issue" ? "" : issue.subject} required maxLength={200} placeholder="Schedule change: Sunday start moved to 09:00" />
            </Field>
            <Field label="Body">
              <RichTextEditor name="body" initialContent={tryParseJson(issue.bodyJson)} placeholder="Write the bulletin…" />
            </Field>
          </Card>

          <div className="mt-4 flex flex-wrap gap-2">
            {/* Two distinct server actions, not one branching on a shared
                "intent" field — each button's formAction is unambiguous
                regardless of how the browser serialises the submitter. */}
            <SubmitButton variant="secondary">Save draft</SubmitButton>
            <SubmitButton formAction={sendBroadcastAction}>Send now</SubmitButton>
          </div>
        </form>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-fg">Preview</h2>
            <p className="mb-3 text-xs text-fg-muted">Reflects the last saved draft — save to refresh it.</p>
            {previewHtml ? (
              <div className="chamfer-tr overflow-hidden border border-line bg-panel">
                <iframe title="Newsletter preview" srcDoc={previewHtml} className="h-[70vh] w-full border-0 bg-white" />
              </div>
            ) : (
              <p className="text-sm text-fg-faint">Save a draft to see the preview.</p>
            )}
          </Card>

          <Card className="border-f1-red/40">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-f1-red">Discard draft</h2>
            <form action={deleteBroadcastDraftAction}>
              <input type="hidden" name="id" value={issue.id} />
              <ConfirmSubmit message="Delete this draft? This cannot be undone.">Delete draft</ConfirmSubmit>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

function tryParseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
