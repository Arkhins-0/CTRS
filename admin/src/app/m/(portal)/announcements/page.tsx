import { desc } from "drizzle-orm";
import { announcements, db } from "@ctr/db";
import { requireMember } from "@/lib/member-auth";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Announcements" };

export default async function MemberAnnouncementsPage() {
  await requireMember();

  const rows = await db.query.announcements.findMany({
    orderBy: desc(announcements.createdAt),
    limit: 50,
    columns: { id: true, title: true, body: true, url: true, sentAt: true, createdAt: true },
  });

  return (
    <>
      <PageHeader title="Announcements" sub="Everything broadcast to the organisation." />

      {rows.length ? (
        <div className="grid gap-3">
          {rows.map((a) => (
            <Card key={a.id}>
              <p className="font-numeric text-[11px] uppercase tracking-wide text-fg-faint">
                {(a.sentAt ?? a.createdAt).toISOString().slice(0, 16).replace("T", " ")}
              </p>
              <h2 className="mt-1 text-base font-bold text-fg">{a.title}</h2>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-fg-muted">
                {a.body}
              </p>
              {a.url ? (
                <a
                  href={a.url}
                  className="mt-2 inline-block text-xs font-bold uppercase tracking-wide text-accent hover:underline"
                >
                  Open link
                </a>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No announcements yet"
          hint="Race control and the organisers will post here."
        />
      )}
    </>
  );
}
