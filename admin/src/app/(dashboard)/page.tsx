import Link from "next/link";
import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import {
  articles,
  auditLog,
  adminUsers,
  db,
  fans,
  grandsPrix,
  newsletterSubscribers,
  raceSessions,
  sessionResults,
} from "@ctr/db";
import { requireAdmin } from "@/lib/auth";
import { Card, PageHeader, StatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await requireAdmin();

  const [draftCount] = await db
    .select({ n: count() })
    .from(articles)
    .where(eq(articles.status, "draft"));
  const [fanCount] = await db.select({ n: count() }).from(fans);
  const [subCount] = await db
    .select({ n: count() })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "confirmed"));

  // next scheduled GP
  const [nextGp] = await db
    .select()
    .from(grandsPrix)
    .where(eq(grandsPrix.status, "scheduled"))
    .orderBy(grandsPrix.seasonYear, grandsPrix.round)
    .limit(1);

  // completed sessions with no results yet (missing-results checklist)
  const missing = await db
    .select({
      sessionId: raceSessions.id,
      type: raceSessions.type,
      gpName: grandsPrix.name,
      year: grandsPrix.seasonYear,
    })
    .from(raceSessions)
    .innerJoin(grandsPrix, eq(raceSessions.grandPrixId, grandsPrix.id))
    .leftJoin(sessionResults, eq(sessionResults.sessionId, raceSessions.id))
    .where(and(eq(raceSessions.status, "completed"), isNull(sessionResults.id)))
    .groupBy(raceSessions.id, raceSessions.type, grandsPrix.name, grandsPrix.seasonYear)
    .limit(8);

  const recentAudit = await db
    .select({
      action: auditLog.action,
      entityType: auditLog.entityType,
      createdAt: auditLog.createdAt,
      actor: adminUsers.displayName,
    })
    .from(auditLog)
    .leftJoin(adminUsers, eq(auditLog.adminUserId, adminUsers.id))
    .orderBy(desc(auditLog.id))
    .limit(8);

  const resultsSessions = missing.filter((m) => ["race", "sprint", "qualifying"].includes(m.type));

  return (
    <>
      <PageHeader
        title={`Welcome, ${session.user.displayName}`}
        sub="Here's what needs attention across the site."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-f1-grey">Draft articles</p>
          <p className="mt-1 text-4xl font-black">{draftCount?.n ?? 0}</p>
          <Link href="/news?status=draft" className="mt-2 inline-block text-xs font-bold uppercase text-f1-red hover:underline">
            Review drafts →
          </Link>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-f1-grey">Fan accounts</p>
          <p className="mt-1 text-4xl font-black">{fanCount?.n ?? 0}</p>
          <Link href="/fans" className="mt-2 inline-block text-xs font-bold uppercase text-f1-red hover:underline">
            View fans →
          </Link>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-f1-grey">Newsletter subscribers</p>
          <p className="mt-1 text-4xl font-black">{subCount?.n ?? 0}</p>
          <Link href="/newsletter" className="mt-2 inline-block text-xs font-bold uppercase text-f1-red hover:underline">
            Manage list →
          </Link>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-black uppercase tracking-wide">Next race weekend</h2>
          {nextGp ? (
            <div className="mt-3">
              <p className="text-2xl font-black uppercase">{nextGp.name}</p>
              <p className="text-sm text-f1-grey">
                Round {nextGp.round} · {nextGp.seasonYear} · {nextGp.startDate} → {nextGp.endDate}
              </p>
              <Link
                href={`/races/${nextGp.id}`}
                className="mt-2 inline-block text-xs font-bold uppercase text-f1-red hover:underline"
              >
                Manage weekend →
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-f1-grey">No upcoming race weekend scheduled.</p>
          )}

          <h2 className="mt-6 text-sm font-black uppercase tracking-wide">Missing results</h2>
          {resultsSessions.length ? (
            <ul className="mt-2 space-y-1.5">
              {resultsSessions.map((m) => (
                <li key={m.sessionId} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {m.gpName} {m.year} — <span className="font-bold uppercase">{m.type.replace(/_/g, " ")}</span>
                  </span>
                  <Link
                    href={`/results/session/${m.sessionId}`}
                    className="text-xs font-bold uppercase text-f1-red hover:underline"
                  >
                    Enter →
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-f1-grey">All completed sessions have results. ✓</p>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-black uppercase tracking-wide">Recent activity</h2>
          {recentAudit.length ? (
            <ul className="mt-3 space-y-2">
              {recentAudit.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">
                    <span className="font-bold">{a.actor ?? "system"}</span>{" "}
                    <span className="text-f1-grey">{a.action}</span>
                  </span>
                  <StatusPill status={a.entityType} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-f1-grey">No activity yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}
