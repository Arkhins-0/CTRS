import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

/** Cache bridge: the admin CMS posts { secret, tags } after every mutation. */
export async function POST(req: NextRequest) {
  let body: { secret?: string; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!process.env.REVALIDATE_SECRET || body.secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const tags = (body.tags ?? []).filter((t) => typeof t === "string").slice(0, 100);
  for (const tag of tags) revalidateTag(tag);
  return NextResponse.json({ revalidated: tags });
}
