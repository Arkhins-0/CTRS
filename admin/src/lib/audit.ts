import { auditLog, db } from "@ctr/db";

/** Append-only audit trail — call from every mutating server action. */
export async function writeAudit(opts: {
  actorId: string | null;
  action: string; // e.g. "article.publish"
  entityType: string; // e.g. "article"
  entityId?: string | null;
  diff?: unknown; // { before, after } — keep it small
}) {
  try {
    await db.insert(auditLog).values({
      adminUserId: opts.actorId,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId ?? null,
      diff: opts.diff ?? null,
    });
  } catch (err) {
    console.error("audit write failed", err); // never block the mutation itself
  }
}
