import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@ctr/db";
import { checkPermission, getAdminSession } from "@/lib/auth";
import { deleteMediaById, moveMedia } from "@/lib/media-ops";

export const dynamic = "force-dynamic";

async function guard() {
  const session = await checkPermission(PERMISSIONS.MEDIA_MANAGE);
  if (session) return { session, response: null as null };
  const anySession = await getAdminSession();
  return {
    session: null,
    response: NextResponse.json(
      { error: anySession ? "Forbidden" : "Unauthenticated" },
      { status: anySession ? 403 : 401 },
    ),
  };
}

/**
 * DELETE /api/media-item  { id }
 * Deletes one image from inside the explorer. Refused with the usage list
 * while anything still references it — the same guard the /media/[id] page
 * applies, so a picture cannot vanish out from under a published article.
 */
export async function DELETE(req: Request) {
  const { session, response } = await guard();
  if (!session) return response;

  const parsed = z
    .object({ id: z.string().uuid() })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const result = await deleteMediaById(parsed.data.id, session.user.id);
  if (result.ok) return NextResponse.json({ ok: true });
  if (result.reason === "not-found") {
    return NextResponse.json({ error: "That file no longer exists." }, { status: 404 });
  }
  return NextResponse.json(
    {
      error: `In use by ${result.usage.length} item${result.usage.length === 1 ? "" : "s"} — remove those references first.`,
      usage: result.usage,
    },
    { status: 409 },
  );
}

/** PATCH /api/media-item  { id, folder } — move a file between folders. */
export async function PATCH(req: Request) {
  const { session, response } = await guard();
  if (!session) return response;

  const parsed = z
    .object({ id: z.string().uuid(), folder: z.string().max(300) })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const ok = await moveMedia(parsed.data.id, parsed.data.folder, session.user.id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "That file no longer exists." }, { status: 404 });
}
