import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, newsletterSubscribers, PERMISSIONS } from "@ctr/db";
import { checkPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const statusSchema = z.enum(["pending", "confirmed", "unsubscribed"]).optional();

function csvEscape(v: string) {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(request: Request) {
  const session = await checkPermission(PERMISSIONS.NEWSLETTER_EXPORT);
  if (!session) return new Response("Forbidden", { status: 403 });

  const raw = new URL(request.url).searchParams.get("status");
  const parsed = statusSchema.safeParse(raw ?? undefined);
  if (!parsed.success) return new Response("Invalid status filter", { status: 400 });
  const status = parsed.data;

  const rows = await db
    .select({
      email: newsletterSubscribers.email,
      status: newsletterSubscribers.status,
      source: newsletterSubscribers.source,
      createdAt: newsletterSubscribers.createdAt,
      confirmedAt: newsletterSubscribers.confirmedAt,
    })
    .from(newsletterSubscribers)
    .where(status ? eq(newsletterSubscribers.status, status) : undefined)
    .orderBy(asc(newsletterSubscribers.createdAt));

  await writeAudit({
    actorId: session.user.id,
    action: "newsletter.export",
    entityType: "newsletter_subscriber",
    diff: { after: { status: status ?? "all", count: rows.length } },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode("email,status,source,created_at,confirmed_at\r\n"));
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const lines = rows
          .slice(i, i + CHUNK)
          .map((r) =>
            [
              csvEscape(r.email),
              r.status,
              csvEscape(r.source ?? ""),
              r.createdAt.toISOString(),
              r.confirmedAt ? r.confirmedAt.toISOString() : "",
            ].join(","),
          )
          .join("\r\n");
        controller.enqueue(encoder.encode(lines + "\r\n"));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="newsletter-subscribers.csv"',
      "cache-control": "no-store",
    },
  });
}
