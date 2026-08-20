import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db, TAGS, videos } from "@ctr/db";
import { VideoCard } from "@/components/news/video-card";
import { cached } from "@/lib/cache";

export const metadata: Metadata = {
  title: "Video",
  description:
    "Race highlights, onboards and features from the CTR–JK Tyre FMSCI Indian National Car Racing Championship.",
};

function getVideos() {
  return cached(
    () =>
      db.query.videos.findMany({
        where: eq(videos.status, "published"),
        orderBy: [desc(videos.publishedAt)],
        limit: 24,
        with: { thumbnail: true },
      }),
    ["video-hub"],
    [TAGS.videos],
  );
}

export default async function VideoHubPage() {
  const rows = await getVideos();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="border-l-4 border-accent pl-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
        Video
      </h1>

      {rows.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      ) : (
        <div className="chamfer-tr mx-auto mt-12 max-w-xl border border-line bg-surface px-6 py-12 text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-accent">
            Lights out soon
          </p>
          <p className="mt-3 text-lg font-black uppercase tracking-tight text-white">
            Videos are coming with the first race weekend
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            Highlights, onboards and features land here once the 2026 season gets under way.
          </p>
        </div>
      )}
    </main>
  );
}
