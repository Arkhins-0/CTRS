import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, media, raceSessions, PERMISSIONS, TAGS } from "@ctr/db";
import { checkPermission, getAdminSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";
import { deleteObject, publicUrl, putObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * The official result declaration — the signed classification PDF on the
 * championship letterhead (an "office order"), attached to one race session
 * and published on the public site next to the stored classification.
 *
 * POST   multipart { sessionId, file: .pdf } → uploads to S3, stores a media
 *        row (kind "file") and links it to the session (replacing any prior one).
 * DELETE json { sessionId }                  → detaches and deletes the PDF.
 */

async function requireResultsManage() {
  const session = await checkPermission(PERMISSIONS.RESULTS_MANAGE);
  if (session) return session;
  const anySession = await getAdminSession();
  throw NextResponse.json(
    { error: anySession ? "Forbidden" : "Unauthenticated" },
    { status: anySession ? 403 : 401 },
  );
}

async function loadSession(sessionId: string) {
  const parsed = z.string().uuid().safeParse(sessionId);
  if (!parsed.success) throw NextResponse.json({ error: "Invalid session id." }, { status: 400 });
  const session = await db.query.raceSessions.findFirst({
    where: eq(raceSessions.id, parsed.data),
    with: { round: { columns: { id: true } }, declarationDocument: true },
  });
  if (!session) throw NextResponse.json({ error: "Session not found." }, { status: 404 });
  return session;
}

async function revalidateDeclaration(sessionId: string, roundId: string) {
  await revalidateSite([
    TAGS.results,
    TAGS.resultsSession(sessionId),
    TAGS.gp(roundId),
    TAGS.schedule,
  ]);
}

/** Best-effort removal of a previously linked declaration (S3 + media row). */
async function removeDeclarationMedia(doc: { id: string; path: string }) {
  try {
    await deleteObject(doc.path);
  } catch (err) {
    console.error("declaration S3 delete failed", err);
  }
  // deleting the media row nulls race_sessions.declaration_media_id (FK set null)
  await db.delete(media).where(eq(media.id, doc.id));
}

export async function POST(req: Request) {
  try {
    const admin = await requireResultsManage();

    let sessionId = "";
    let file: File;
    try {
      const form = await req.formData();
      sessionId = typeof form.get("sessionId") === "string" ? (form.get("sessionId") as string) : "";
      const entry = form.get("file");
      if (!(entry instanceof File)) {
        return NextResponse.json({ error: "Missing file field." }, { status: 400 });
      }
      file = entry;
    } catch {
      return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds the 15 MB limit." }, { status: 413 });
    }

    const session = await loadSession(sessionId);
    const buffer = Buffer.from(await file.arrayBuffer());

    const now = new Date();
    const key = `media/documents/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${randomUUID()}.pdf`;
    await putObject(key, buffer, "application/pdf");

    const [row] = await db
      .insert(media)
      .values({
        kind: "file",
        path: key,
        filename: file.name.slice(0, 255),
        mime: "application/pdf",
        sizeBytes: file.size,
        uploadedBy: admin.user.id,
      })
      .returning();
    await db
      .update(raceSessions)
      .set({ declarationMediaId: row.id })
      .where(eq(raceSessions.id, session.id));

    // a re-upload replaces the previous declaration outright
    if (session.declarationDocument) await removeDeclarationMedia(session.declarationDocument);

    await writeAudit({
      actorId: admin.user.id,
      action: "results.declaration.upload",
      entityType: "race_session",
      entityId: session.id,
      diff: {
        before: session.declarationDocument
          ? { path: session.declarationDocument.path, filename: session.declarationDocument.filename }
          : null,
        after: { path: key, filename: file.name, sizeBytes: file.size },
      },
    });
    await revalidateDeclaration(session.id, session.round.id);

    return NextResponse.json({ mediaId: row.id, url: publicUrl(key), filename: row.filename });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("declaration upload failed", err);
    return NextResponse.json({ error: "Upload failed — try again." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireResultsManage();

    let sessionId = "";
    try {
      const body = (await req.json()) as { sessionId?: string };
      sessionId = body.sessionId ?? "";
    } catch {
      return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
    }

    const session = await loadSession(sessionId);
    if (!session.declarationDocument) {
      return NextResponse.json({ error: "This session has no declaration." }, { status: 404 });
    }

    await removeDeclarationMedia(session.declarationDocument);

    await writeAudit({
      actorId: admin.user.id,
      action: "results.declaration.remove",
      entityType: "race_session",
      entityId: session.id,
      diff: {
        before: {
          path: session.declarationDocument.path,
          filename: session.declarationDocument.filename,
        },
      },
    });
    await revalidateDeclaration(session.id, session.round.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("declaration removal failed", err);
    return NextResponse.json({ error: "Removal failed — try again." }, { status: 500 });
  }
}
