import { NextResponse } from "next/server";
import { PERMISSIONS } from "@ctr/db";
import { checkPermission, getAdminSession } from "@/lib/auth";
import { listFolder } from "@/lib/media-ops";

export const dynamic = "force-dynamic";

/**
 * Folder listing for the client-side picker/explorer:
 *   GET /api/media-list?folder=&q=&page=
 * Returns the folder's immediate subfolders plus its images. A `q` searches
 * the whole library and returns no folders.
 */
export async function GET(req: Request) {
  const session = await checkPermission(PERMISSIONS.MEDIA_READ);
  if (!session) {
    const anySession = await getAdminSession();
    return NextResponse.json(
      { error: anySession ? "Forbidden" : "Unauthenticated" },
      { status: anySession ? 403 : 401 },
    );
  }

  const url = new URL(req.url);
  const listing = await listFolder({
    folder: url.searchParams.get("folder"),
    q: url.searchParams.get("q"),
    page: Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
  });

  return NextResponse.json({
    ...listing,
    /** Write actions are hidden in the UI for read-only roles. */
    canManage: session.permissions.has(PERMISSIONS.MEDIA_MANAGE),
  });
}
