import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@ctr/db";
import { checkPermission, getAdminSession } from "@/lib/auth";
import { createFolder, deleteFolder } from "@/lib/media-ops";

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

const bodySchema = z.object({ path: z.string().min(1).max(300) });

/** POST /api/media-folder  { path } — create a folder (and its ancestors). */
export async function POST(req: Request) {
  const { session, response } = await guard();
  if (!session) return response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const result = await createFolder(parsed.data.path, session.user.id);
  if (result.ok) return NextResponse.json({ ok: true, path: result.path });
  return NextResponse.json(
    {
      error:
        result.reason === "exists"
          ? "A folder with that name already exists here."
          : "Folder names need at least one letter or number.",
    },
    { status: result.reason === "exists" ? 409 : 400 },
  );
}

/**
 * DELETE /api/media-folder  { path }
 * Only empty folders are removed — recursive deletion is deliberately not
 * offered, since the files inside can be referenced by published content.
 */
export async function DELETE(req: Request) {
  const { session, response } = await guard();
  if (!session) return response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const result = await deleteFolder(parsed.data.path, session.user.id);
  if (result.ok) return NextResponse.json({ ok: true });
  if (result.reason === "not-empty") {
    const bits = [
      result.files ? `${result.files} file${result.files === 1 ? "" : "s"}` : null,
      result.folders ? `${result.folders} subfolder${result.folders === 1 ? "" : "s"}` : null,
    ].filter(Boolean);
    return NextResponse.json(
      { error: `Folder still holds ${bits.join(" and ")} — empty it first.` },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { error: result.reason === "not-found" ? "That folder no longer exists." : "Invalid folder." },
    { status: result.reason === "not-found" ? 404 : 400 },
  );
}
