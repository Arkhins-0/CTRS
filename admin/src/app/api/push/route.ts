import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, pushSubscriptions } from "@ctr/db";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Push subscription store for admin-dashboard devices — any signed-in admin
 * may subscribe; the device is linked to their admin account (cascade-deleted
 * with it) and receives every announcement alongside fan devices.
 *
 * POST   { endpoint, keys: { p256dh, auth } } → upsert
 * DELETE { endpoint }                         → remove (own subscription only)
 */

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(300),
    auth: z.string().min(1).max(100),
  }),
});

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let input: z.infer<typeof subscribeSchema>;
  try {
    input = subscribeSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  await db
    .insert(pushSubscriptions)
    .values({
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      adminUserId: session.user.id,
      userAgent: (req.headers.get("user-agent") ?? "").slice(0, 300) || null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        adminUserId: session.user.id,
      },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let endpoint = "";
  try {
    const body = (await req.json()) as { endpoint?: string };
    endpoint = body.endpoint ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.adminUserId, session.user.id),
      ),
    );
  return NextResponse.json({ ok: true });
}
