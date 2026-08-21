import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db, TAGS, videos } from "@ctr/db";
import { NewsHubBand } from "@/components/news/article-hub";
import { NewsEmpty } from "@/components/news/article-card";
import { VideoGrid } from "@/components/news/video-card";
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
    <NewsHubBand
      title="Video"
      note={rows.length ? `${rows.length} ${rows.length === 1 ? "video" : "videos"}` : null}
    >
      {rows.length ? (
        <VideoGrid videos={rows} />
      ) : (
        <NewsEmpty>
          Highlights, onboards and features land here once the season gets under way.
        </NewsEmpty>
      )}
    </NewsHubBand>
  );
}
