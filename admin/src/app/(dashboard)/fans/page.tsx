import Link from "next/link";
import { format } from "date-fns";
import { count, desc, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db, fanFavourites, fans, PERMISSIONS, savedArticles } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, Input, PageHeader, Table } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { deactivateFanAction, reactivateFanAction } from "./actions";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;

function fansUrl(q: string, page: number) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/fans?${qs}` : "/fans";
}

export default async function FansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermission(PERMISSIONS.FANS_VIEW);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: SQL | undefined = q
    ? or(ilike(fans.email, `%${q}%`), ilike(fans.displayName, `%${q}%`))
    : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(fans)
      .where(where)
      .orderBy(desc(fans.createdAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(fans).where(where),
  ]);

  const ids = rows.map((f) => f.id);
  const [favRows, savedRows] = ids.length
    ? await Promise.all([
        db
          .select({ fanId: fanFavourites.fanId, entityType: fanFavourites.entityType, n: count() })
          .from(fanFavourites)
          .where(inArray(fanFavourites.fanId, ids))
          .groupBy(fanFavourites.fanId, fanFavourites.entityType),
        db
          .select({ fanId: savedArticles.fanId, n: count() })
          .from(savedArticles)
          .where(inArray(savedArticles.fanId, ids))
          .groupBy(savedArticles.fanId),
      ])
    : [[], []];

  const favMap = new Map<string, { driver: number; team: number }>();
  for (const r of favRows) {
    const entry = favMap.get(r.fanId) ?? { driver: 0, team: 0 };
    entry[r.entityType] = r.n;
    favMap.set(r.fanId, entry);
  }
  const savedMap = new Map(savedRows.map((r) => [r.fanId, r.n]));

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader title="Fans" sub={`${total} registered fan account${total === 1 ? "" : "s"}.`} />

      <form method="get" className="mb-4 flex max-w-md items-center gap-2">
        <Input name="q" defaultValue={q} placeholder="Search email or display name…" />
        <SubmitButton variant="secondary">Search</SubmitButton>
      </form>

      {rows.length ? (
        <Table
          head={
            <>
              <th>Display name</th>
              <th>Email</th>
              <th>Country</th>
              <th>Joined</th>
              <th>Status</th>
              <th>Favourites</th>
              <th>Saved</th>
              <th className="text-right">Actions</th>
            </>
          }
        >
          {rows.map((f) => {
            const fav = favMap.get(f.id) ?? { driver: 0, team: 0 };
            const active = !f.deactivatedAt;
            return (
              <tr key={f.id}>
                <td className="font-bold">{f.displayName}</td>
                <td className="text-fg-muted">{f.email}</td>
                <td className="uppercase">{f.countryCode ?? "—"}</td>
                <td className="whitespace-nowrap text-fg-muted">{format(f.createdAt, "d MMM yyyy")}</td>
                <td>
                  <span
                    className={`inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      active ? "bg-emerald-600 text-white" : "bg-line text-fg"
                    }`}
                  >
                    {active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="whitespace-nowrap text-fg-muted">
                  {fav.driver} driver{fav.driver === 1 ? "" : "s"} · {fav.team} team{fav.team === 1 ? "" : "s"}
                </td>
                <td>{savedMap.get(f.id) ?? 0}</td>
                <td>
                  <div className="flex justify-end">
                    {active ? (
                      <form action={deactivateFanAction}>
                        <input type="hidden" name="fanId" value={f.id} />
                        <ConfirmSubmit message={`Deactivate ${f.displayName}? They will be signed out everywhere.`}>
                          Deactivate
                        </ConfirmSubmit>
                      </form>
                    ) : (
                      <form action={reactivateFanAction}>
                        <input type="hidden" name="fanId" value={f.id} />
                        <SubmitButton variant="secondary" className="px-3 py-1.5 text-xs">
                          Reactivate
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <EmptyState title="No fans found" hint={q ? "Try a different search." : "No fan accounts registered yet."} />
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={fansUrl(q, page - 1)} className="font-bold uppercase text-f1-red hover:underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-fg-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={fansUrl(q, page + 1)} className="font-bold uppercase text-f1-red hover:underline">
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
