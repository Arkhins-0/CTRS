import { format } from "date-fns";
import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, TAGS, videos } from "@ctr/db";
import { SectionHeading } from "@ctr/ui";
import { formatDuration, VideoCard, videoThumbUrl } from "@/components/news/video-card";
import { cached } from "@/lib/cache";
import { mediaUrl } from "@/lib/media";

type Props = { params: Promise<{ slug: string }> };

/* ── Cached video + related bundle ───────────────────────────────────────── */

function getVideoBundle(slug: string) {
  return cached(
    async () => {
      const video = await db.query.videos.findFirst({
        where: eq(videos.slug, slug),
        with: { file: true, thumbnail: true },
      });
      if (!video || video.status !== "published") return null;

      const relatedRaw = await db.query.videos.findMany({
        where: eq(videos.status, "published"),
        orderBy: [desc(videos.publishedAt)],
        limit: 5, // one spare in case the current video is among the newest
        with: { thumbnail: true },
      });
      const related = relatedRaw.filter((v) => v.id !== video.id).slice(0, 4);

      return { video, related };
    },
    ["video", slug],
    [TAGS.video(slug), TAGS.videos],
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getVideoBundle(slug);
  if (!bundle) return { title: "Video not found" };

  const { video } = bundle;
  const og = videoThumbUrl(video);
  return {
    title: video.title,
    description: video.description ?? undefined,
    openGraph: {
      title: video.title,
      description: video.description ?? undefined,
      images: og ? [{ url: og }] : undefined,
    },
  };
}

/* ── Page ────────────────────────────────────────────────────────────────── */

function UnavailablePlayer() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-carbon-fibre px-4 text-center">
      <span className="text-sm font-black uppercase tracking-[0.25em] text-f1-grey-light">
        Video unavailable
      </span>
      <span className="text-xs text-f1-grey">
        This video can&apos;t be played right now — please check back later.
      </span>
    </div>
  );
}

export default async function VideoPage({ params }: Props) {
  const { slug } = await params;
  const bundle = await getVideoBundle(slug);
  if (!bundle) notFound();

  const { video, related } = bundle;
  const fileUrl = mediaUrl(video.file?.path);
  const poster = mediaUrl(video.thumbnail?.path);
  const duration = formatDuration(video.durationSeconds);

  return (
    <main>
      {/* player band */}
      <div className="bg-carbon">
        <div className="mx-auto max-w-5xl sm:px-4 sm:py-8">
          <div className="relative aspect-video w-full overflow-hidden bg-carbon">
            {video.provider === "youtube" ? (
              video.externalId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.externalId}`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : (
                <UnavailablePlayer />
              )
            ) : fileUrl ? (
              <video
                controls
                src={fileUrl}
                poster={poster ?? undefined}
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <UnavailablePlayer />
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-black uppercase leading-tight tracking-tight text-carbon sm:text-3xl">
            {video.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold uppercase tracking-wide text-f1-grey">
            {video.publishedAt ? (
              <time dateTime={new Date(video.publishedAt).toISOString()}>
                {format(new Date(video.publishedAt), "d MMMM yyyy")}
              </time>
            ) : null}
            {duration ? <span>{duration}</span> : null}
          </div>

          {video.description ? (
            <p className="mt-5 max-w-3xl text-[17px] leading-relaxed text-carbon">
              {video.description}
            </p>
          ) : null}
        </div>

        {related.length ? (
          <section className="mt-14">
            <SectionHeading>More Videos</SectionHeading>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
