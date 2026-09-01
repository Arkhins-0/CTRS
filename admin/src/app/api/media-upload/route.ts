import { NextResponse } from "next/server";
import { PERMISSIONS } from "@ctr/db";
import { checkPermission, getAdminSession } from "@/lib/auth";
import { uploadImages } from "@/lib/media-ops";

export const dynamic = "force-dynamic";
/** sharp + several full-size renditions per file — well past the default 10s. */
export const maxDuration = 60;

/**
 * Multipart upload used by the picker/explorer wherever an image is needed,
 * so nobody has to leave the form they are filling in to visit /media first.
 * Fields: `files` (one or more) and an optional `folder`.
 *
 * A route handler rather than a server action on purpose: the picker renders
 * inside other forms, and a nested form is invalid HTML.
 */
export async function POST(req: Request) {
  const session = await checkPermission(PERMISSIONS.MEDIA_MANAGE);
  if (!session) {
    const anySession = await getAdminSession();
    return NextResponse.json(
      { error: anySession ? "Forbidden" : "Unauthenticated" },
      { status: anySession ? 403 : 401 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Malformed upload." }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) {
    return NextResponse.json({ error: "No files were uploaded." }, { status: 400 });
  }

  try {
    const { items, rejected } = await uploadImages({
      files,
      folder: form.get("folder")?.toString() ?? "",
      actorId: session.user.id,
    });
    if (!items.length) {
      return NextResponse.json(
        { error: "No valid image files — images only, up to 25 MB each." },
        { status: 400 },
      );
    }
    return NextResponse.json({ items, rejected });
  } catch (err) {
    console.error("media upload failed", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
