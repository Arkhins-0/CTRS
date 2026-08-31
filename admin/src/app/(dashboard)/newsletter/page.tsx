import Link from "next/link";
import { format } from "date-fns";
import { and, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import { db, newsletterSubscribers, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, Input, PageHeader, Select, StatusPill, Table } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { deleteSubscriberAction, markUnsubscribedAction } from "./actions";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;
const STATUSES = ["pending", "confirmed", "unsubscribed"] as const;
type SubStatus = (typeof STATUSES)[number];

function listUrl(status: string, q: string, page: number) {
  const sp = new URLSearchParams();
  if (status) sp.set("status", status);
  if (q) sp.set("q", q);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/newsletter?${qs}` : "/newsletter";
}

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const session = await requirePermission(PERMISSIONS.NEWSLETTER_VIEW);
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as SubStatus) ? (sp.status as SubStatus) : "";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(newsletterSubscribers.status, status));
  if (q) conditions.push(ilike(newsletterSubscribers.email, `%${q}%`));
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(newsletterSubscribers)
      .where(where)
      .orderBy(desc(newsletterSubscribers.createdAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(newsletterSubscribers).where(where),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const canExport = session.permissions.has(PERMISSIONS.NEWSLETTER_EXPORT);

  return (
    <>
      <PageHeader
        title="Newsletter"
        sub={`${total} subscriber${total === 1 ? "" : "s"}${status ? ` · ${status}` : ""}.`}
        actions={
          canExport ? (
            // plain <a>: downloads must bypass the client router (Link would prefetch/intercept)
            <a
              href="/api/newsletter-export?status=confirmed"
              className="chamfer-tr inline-flex items-center justify-center gap-2 bg-f1-red px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-f1-red-dark"
            >
              Export CSV
            </a>
          ) : undefined
        }
      />

      <form method="get" className="mb-4 flex max-w-xl flex-wrap items-center gap-2">
        <Select name="status" defaultValue={status} className="w-44">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Input name="q" defaultValue={q} placeholder="Search email…" className="w-64 flex-1" />
        <SubmitButton variant="secondary">Filter</SubmitButton>
      </form>

      {rows.length ? (
        <Table
          head={
            <>
              <th>Email</th>
              <th>Status</th>
              <th>Source</th>
              <th>Fan</th>
              <th>Subscribed</th>
              <th>Confirmed</th>
              <th className="text-right">Actions</th>
            </>
          }
        >
          {rows.map((s) => (
            <tr key={s.id}>
              <td className="font-bold">{s.email}</td>
              <td>
                <StatusPill status={s.status} />
              </td>
              <td className="text-fg-muted">{s.source ?? "—"}</td>
              <td>
                {s.fanId ? (
                  <span className="inline-block bg-panel px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    Fan
                  </span>
                ) : (
                  <span className="text-fg-faint">—</span>
                )}
              </td>
              <td className="whitespace-nowrap text-fg-muted">{format(s.createdAt, "d MMM yyyy")}</td>
              <td className="whitespace-nowrap text-fg-muted">
                {s.confirmedAt ? format(s.confirmedAt, "d MMM yyyy") : "—"}
              </td>
              <td>
                <div className="flex items-center justify-end gap-2">
                  {s.status !== "unsubscribed" && (
                    <form action={markUnsubscribedAction}>
                      <input type="hidden" name="subscriberId" value={s.id} />
                      <SubmitButton variant="secondary" className="px-3 py-1.5 text-xs">
                        Unsubscribe
                      </SubmitButton>
                    </form>
                  )}
                  <form action={deleteSubscriberAction}>
                    <input type="hidden" name="subscriberId" value={s.id} />
                    <ConfirmSubmit message={`Delete subscriber ${s.email}? This cannot be undone.`}>
                      Delete
                    </ConfirmSubmit>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState
          title="No subscribers found"
          hint={q || status ? "Try different filters." : "Nobody has subscribed yet."}
        />
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={listUrl(status, q, page - 1)} className="font-bold uppercase text-f1-red hover:underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-fg-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={listUrl(status, q, page + 1)} className="font-bold uppercase text-f1-red hover:underline">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}
