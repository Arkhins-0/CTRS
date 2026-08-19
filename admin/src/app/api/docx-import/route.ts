import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { PERMISSIONS } from "@ctr/db";
import { checkPermission, getAdminSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { publicUrl } from "@/lib/storage";
import { processAndStoreImage } from "@/components/media/process-image";
import { sanitizeBodyHtml } from "@/components/editor/sanitize";

export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * POST multipart { file: .docx } → { html, warnings } for the article editor.
 * Embedded images are extracted, converted to webp (+ variants), stored in
 * the media library and referenced by their public S3 URL.
 */
export async function POST(req: Request) {
  const session = await checkPermission(PERMISSIONS.NEWS_MANAGE);
  if (!session) {
    const anySession = await getAdminSession();
    return NextResponse.json(
      { error: anySession ? "Forbidden" : "Unauthenticated" },
      { status: anySession ? 403 : 401 },
    );
  }

  let file: File;
  try {
    const form = await req.formData();
    const entry = form.get("file");
    if (!(entry instanceof File)) {
      return NextResponse.json({ error: "Missing file field." }, { status: 400 });
    }
    file = entry;
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".docx") && file.type !== DOCX_MIME) {
    return NextResponse.json({ error: "Only .docx files are supported." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds the 20 MB limit." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let imageCount = 0;

  try {
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: [
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Subtitle'] => p:fresh",
          "p[style-name='Quote'] => blockquote:fresh",
          "p[style-name='Intense Quote'] => blockquote:fresh",
        ],
        convertImage: mammoth.images.imgElement(async (image) => {
          try {
            const buf = await image.read();
            imageCount += 1;
            const row = await processAndStoreImage({
              buffer: Buffer.from(buf),
              filename: `${file.name.replace(/\.docx$/i, "")}-image-${imageCount}.webp`,
              uploadedBy: session.user.id,
              credit: "docx import",
              maxWidth: 1600,
            });
            await writeAudit({
              actorId: session.user.id,
              action: "media.upload",
              entityType: "media",
              entityId: row.id,
              diff: { after: { path: row.path, filename: row.filename, source: "docx" } },
            });
            return { src: publicUrl(row.path) };
          } catch (err) {
            console.error("docx image import failed", err);
            return { src: "" }; // stripped below
          }
        }),
      },
    );

    // Drop images that failed to process, then apply the editorial allowlist.
    const html = sanitizeBodyHtml(result.value.replace(/<img[^>]*src=""[^>]*\/?>/g, ""));
    const warnings = result.messages.map((m) => m.message);

    await writeAudit({
      actorId: session.user.id,
      action: "article.docx-import",
      entityType: "article",
      diff: { after: { filename: file.name, sizeBytes: file.size, imagesImported: imageCount } },
    });

    return NextResponse.json({ html, warnings });
  } catch (err) {
    console.error("docx conversion failed", err);
    return NextResponse.json({ error: "Could not convert this .docx file." }, { status: 422 });
  }
}
