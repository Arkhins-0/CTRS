import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db, TAGS, videos } from "@ctr/db";
import { VideoCard } from "@/components/news/video-card";
import { cached } from "@/lib/cache";

export const metadata: Metadata = {
  title: "Video",
  description: "Race highlights, analysis and features — the CTR Sports video hub.",
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
      <h1 className="border-l-4 border-f1-red pl-3 text-3xl font-black uppercase tracking-tight text-carbon sm:text-4xl">
        Video
      </h1>

      {rows.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-center text-sm font-semibold uppercase tracking-wide text-f1-grey">
          No videos published yet — check back after the next session.
        </p>
      )}
    </main>
  );
}
