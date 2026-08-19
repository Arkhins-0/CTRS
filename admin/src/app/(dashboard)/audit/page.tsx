import Link from "next/link";
import { format } from "date-fns";
import { and, asc, count, desc, eq, gte, ilike, lte, type SQL } from "drizzle-orm";
import { adminUsers, auditLog, db, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { EmptyState, Input, LinkButton, PageHeader, Select, Table } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;

type Filters = { entityType: string; action: string; actor: string; from: string; to: string };

function auditUrl(filters: Filters, page: number) {
  const sp = new URLSearchParams();
  if (filters.entityType) sp.set("entityType", filters.entityType);
  if (filters.action) sp.set("action", filters.action);
  if (filters.actor) sp.set("actor", filters.actor);
  if (filters.from) sp.set("from", filters.from);
  if (filters.to) sp.set("to", filters.to);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/audit?${qs}` : "/audit";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    entityType?: string;
    action?: string;
    actor?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.AUDIT_VIEW);
  const sp = await searchParams;
  const filters: Filters = {
    entityType: (sp.entityType ?? "").trim(),
    action: (sp.action ?? "").trim(),
    actor: (sp.actor ?? "").trim(),
    from: (sp.from ?? "").trim(),
    to: (sp.to ?? "").trim(),
  };
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const conditions: SQL[] = [];
  if (filters.entityType) conditions.push(eq(auditLog.entityType, filters.entityType));
  if (filters.action) conditions.push(ilike(auditLog.action, `%${filters.action}%`));
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.actor)) {
    conditions.push(eq(auditLog.adminUserId, filters.actor));
  }
  if (filters.from) {
    const from = new Date(filters.from);
    if (!Number.isNaN(from.getTime())) conditions.push(gte(auditLog.createdAt, from));
  }
  if (filters.to) {
    const to = new Date(`${filters.to}T23:59:59.999`);
    if (!Number.isNaN(to.getTime())) conditions.push(lte(auditLog.createdAt, to));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }], entityTypes, actors] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        diff: auditLog.diff,
        createdAt: auditLog.createdAt,
        actor: adminUsers.displayName,
      })
      .from(auditLog)
      .leftJoin(adminUsers, eq(auditLog.adminUserId, adminUsers.id))
      .where(where)
      .orderBy(desc(auditLog.id))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(auditLog).where(where),
    db
      .selectDistinct({ entityType: auditLog.entityType })
      .from(auditLog)
      .orderBy(asc(auditLog.entityType)),
    db
      .select({ id: adminUsers.id, displayName: adminUsers.displayName })
      .from(adminUsers)
      .orderBy(asc(adminUsers.displayName)),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader title="Audit log" sub={`${total} entr${total === 1 ? "y" : "ies"} matching the current filters.`} />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-f1-grey">Entity type</span>
          <Select name="entityType" defaultValue={filters.entityType} className="w-44">
            <option value="">All</option>
            {entityTypes.map((t) => (
              <option key={t.entityType} value={t.entityType}>
                {t.entityType}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-f1-grey">Action contains</span>
          <Input name="action" defaultValue={filters.action} placeholder="e.g. publish" className="w-44" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-f1-grey">Actor</span>
          <Select name="actor" defaultValue={filters.actor} className="w-44">
            <option value="">Anyone</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-f1-grey">From</span>
          <Input name="from" type="date" defaultValue={filters.from} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-f1-grey">To</span>
          <Input name="to" type="date" defaultValue={filters.to} />
        </label>
        <SubmitButton variant="secondary">Apply</SubmitButton>
        <LinkButton href="/audit" variant="ghost">Reset</LinkButton>
      </form>

      {rows.length ? (
        <Table
          head={
            <>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Diff</th>
            </>
          }
        >
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap text-f1-grey">{format(r.createdAt, "d MMM yyyy HH:mm:ss")}</td>
              <td className="font-bold">{r.actor ?? "system"}</td>
              <td className="whitespace-nowrap">{r.action}</td>
              <td className="whitespace-nowrap text-f1-grey">{r.entityType}</td>
              <td className="max-w-40 truncate text-xs text-f1-grey-light">{r.entityId ?? "—"}</td>
              <td>
                {r.diff != null ? (
                  <details>
                    <summary className="cursor-pointer text-xs font-bold uppercase text-f1-red hover:underline">
                      view
                    </summary>
                    <pre className="max-w-lg overflow-auto text-xs">{JSON.stringify(r.diff, null, 2)}</pre>
                  </details>
                ) : (
                  <span className="text-f1-grey-light">—</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title="No audit entries" hint="Nothing matches the current filters." />
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={auditUrl(filters, page - 1)} className="font-bold uppercase text-f1-red hover:underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-f1-grey">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={auditUrl(filters, page + 1)} className="font-bold uppercase text-f1-red hover:underline">
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
