import { count, desc } from "drizzle-orm";
import { format } from "date-fns";
import { announcements, db, pushSubscriptions, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { NotificationsToggle } from "@/components/notifications-toggle";
import { Card, EmptyState, Field, Input, PageHeader, Select, Table, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { sendAnnouncementAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; total?: string; skipped?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.NEWS_MANAGE);
  const sp = await searchParams;

  const [history, subTotals] = await Promise.all([
    db.query.announcements.findMany({
      orderBy: [desc(announcements.createdAt)],
      limit: 50,
      with: { author: { columns: { displayName: true } } },
    }),
    db.select({ n: count() }).from(pushSubscriptions),
  ]);
  const devices = subTotals[0]?.n ?? 0;

  return (
    <>
      <PageHeader
        title="Announcements"
        sub={`Push notifications to every subscribed device — ${devices} device${devices === 1 ? "" : "s"} currently subscribed`}
        actions={<NotificationsToggle />}
      />

      {sp.sent != null ? (
        <div className="chamfer-tr mb-4 border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
          Announcement sent to {sp.sent} of {sp.total ?? sp.sent} subscribed device
          {sp.total === "1" ? "" : "s"}.
          {sp.skipped && sp.skipped !== "0" ? (
            <span className="block font-normal text-fg-muted">
              {sp.skipped} skipped — outside the chosen audience, or opted out of announcements.
            </span>
          ) : null}
        </div>
      ) : sp.error ? (
        <div className="chamfer-tr mb-4 border border-f1-red bg-surface px-4 py-3 text-sm font-bold text-f1-red">
          {sp.error}
        </div>
      ) : null}

      <Card className="mb-8 max-w-2xl">
        <h2 className="text-sm font-black uppercase tracking-wide">New announcement</h2>
        <p className="mt-1 text-xs text-fg-muted">
          Delivered instantly as a push notification on subscribers&apos; phones and desktops.
          Keep the title short — it&apos;s the notification headline.
        </p>
        <form action={sendAnnouncementAction} className="mt-4 flex flex-col gap-4">
          <Field label="Title">
            <Input id="title" name="title" required maxLength={120} placeholder="Race 2 start delayed to 14:30" />
          </Field>
          <Field label="Message">
            <Textarea
              id="body"
              name="body"
              required
              maxLength={500}
              rows={3}
              placeholder="Due to track conditions, ISC Race 2 now starts at 14:30 IST."
            />
          </Field>
          <Field label="Link (optional — opens when the notification is tapped)">
            <Input id="url" name="url" maxLength={300} placeholder="/schedule/2026/coimbatore" />
          </Field>
          <Field
            label="Send to"
            hint="Recipients who turned this category off in their own settings are skipped."
          >
            <Select name="audience" defaultValue="everyone">
              <option value="everyone">Everyone — fans, staff and members</option>
              <option value="members">Members only — crew, drivers and officials</option>
              <option value="staff">Staff only — CMS admins</option>
              <option value="fans">Fans only — public site subscribers</option>
            </Select>
          </Field>
          <div>
            <SubmitButton>Send announcement</SubmitButton>
          </div>
        </form>
      </Card>

      <h2 className="mb-3 text-sm font-black uppercase tracking-wide">History</h2>
      {history.length ? (
        <Table
          head={
            <>
              <th>Announcement</th>
              <th>Link</th>
              <th>Sent</th>
              <th className="w-32 text-right">Delivered</th>
              <th>By</th>
            </>
          }
        >
          {history.map((a) => (
            <tr key={a.id}>
              <td>
                <p className="font-bold">{a.title}</p>
                <p className="max-w-md truncate text-xs text-fg-muted">{a.body}</p>
              </td>
              <td className="max-w-40 truncate text-xs text-fg-muted">{a.url ?? "—"}</td>
              <td className="whitespace-nowrap text-fg-muted">
                {a.sentAt ? format(a.sentAt, "d MMM yyyy, HH:mm") : "—"}
              </td>
              <td className="whitespace-nowrap text-right">
                <span className="font-bold">{a.sentCount}</span>
                {a.failedCount ? (
                  <span className="text-f1-red"> · {a.failedCount} failed</span>
                ) : null}
              </td>
              <td className="text-fg-muted">{a.author?.displayName ?? "—"}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState
          title="No announcements yet"
          hint="The first announcement you send will appear here with its delivery counts."
        />
      )}
    </>
  );
}
