import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, media, PERMISSIONS } from "@ctr/db";
import { checkPermission, getAdminSession } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";

export const dynamic = "force-dynamic";

const PER_PAGE = 40;

/** JSON media listing for the client-side picker: GET /api/media-list?q=&page= */
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
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

  // the picker is image-only — documents (e.g. declaration PDFs) have no thumbs
  let where: SQL | undefined = eq(media.kind, "image");
  if (q) {
    where = and(where, or(ilike(media.filename, `%${q}%`), ilike(media.alt, `%${q}%`)));
  }

  // Fetch one extra row to compute hasMore without a count query.
  const rows = await db
    .select({
      id: media.id,
      path: media.path,
      filename: media.filename,
      alt: media.alt,
      width: media.width,
      height: media.height,
    })
    .from(media)
    .where(where)
    .orderBy(desc(media.createdAt))
    .limit(PER_PAGE + 1)
    .offset((page - 1) * PER_PAGE);

  const hasMore = rows.length > PER_PAGE;
  const items = rows.slice(0, PER_PAGE).map((m) => ({
    ...m,
    url: publicUrl(m.path),
    thumbUrl: publicUrl(variantKey(m.path, "thumb")),
  }));

  return NextResponse.json({ items, hasMore });
}
