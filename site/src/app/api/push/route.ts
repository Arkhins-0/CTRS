import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, pushSubscriptions } from "@ctr/db";
import { getFanSession } from "@/lib/fan-auth";

export const dynamic = "force-dynamic";

/**
 * Web-push subscription store. Anyone may subscribe — a signed-in fan's
 * subscription is linked to their account, an anonymous visitor's is not.
 *
 * POST   { endpoint, keys: { p256dh, auth } } → upsert
 * DELETE { endpoint }                         → remove
 */

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(300),
    auth: z.string().min(1).max(100),
  }),
});

export async function POST(req: Request) {
  let input: z.infer<typeof subscribeSchema>;
  try {
    input = subscribeSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  const session = await getFanSession();
  await db
    .insert(pushSubscriptions)
    .values({
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      fanId: session?.fan.id ?? null,
      userAgent: (req.headers.get("user-agent") ?? "").slice(0, 300) || null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        ...(session ? { fanId: session.fan.id } : {}),
      },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  let endpoint = "";
  try {
    const body = (await req.json()) as { endpoint?: string };
    endpoint = body.endpoint ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  return NextResponse.json({ ok: true });
}
