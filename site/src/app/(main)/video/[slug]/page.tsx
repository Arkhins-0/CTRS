import { format } from "date-fns";
import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db, TAGS, videos } from "@ctr/db";
import { VideoRailBand } from "@/components/home/video-rail";
import { ConsentGatedEmbed } from "@/components/consent/consent-gated-embed";
import { formatDuration, videoThumbUrl } from "@/components/news/video-card";
import { cached } from "@/lib/cache";
import { CONSENT_COOKIE, parseConsent } from "@/lib/consent";
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
        limit: 7, // spare in case the current video is among the newest
        with: { thumbnail: true },
      });
      const related = relatedRaw.filter((v) => v.id !== video.id).slice(0, 6);

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
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-static-10 px-4 text-center">
      <span className="display-s font-medium uppercase text-static-5">Video unavailable</span>
      <span className="body-xs text-static-5">
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
  const mediaConsent =
    parseConsent((await cookies()).get(CONSENT_COOKIE)?.value)?.media === true;

  return (
    <main>
      {/* Player band — always dark, like the F1 media pages */}
      <div className="dark-section bg-surface-3">
        <div className="f1-inner py-0 md:py-8">
          <div className="relative mx-auto aspect-video w-full max-w-[1100px] overflow-hidden bg-black md:rounded-md">
            {video.provider === "youtube" ? (
              video.externalId ? (
                /* youtube-nocookie still contacts Google on load, so the
                   embed is withheld entirely until media consent exists. */
                mediaConsent ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${video.externalId}`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                ) : (
                  <ConsentGatedEmbed
                    src={`https://www.youtube-nocookie.com/embed/${video.externalId}`}
                    title={video.title}
                  />
                )
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

      {/* Title + description */}
      <div className="bg-surface-1">
        <div className="f1-inner py-8 lg:py-12">
          <div className="max-w-[680px]">
            <h1 className="display-xl lg:display-2xl font-black uppercase text-text-5">
              {video.title}
            </h1>
            <div className="body-xs mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-semibold uppercase text-text-3">
              {video.publishedAt ? (
                <time dateTime={new Date(video.publishedAt).toISOString()}>
                  {format(new Date(video.publishedAt), "d MMMM yyyy")}
                </time>
              ) : null}
              {duration ? <span className="font-digits">{duration}</span> : null}
            </div>
            {video.description ? (
              <p className="body-m mt-6 text-text-4">{video.description}</p>
            ) : null}
          </div>
        </div>
      </div>

      <VideoRailBand title="More videos" videos={related} dark={false} />
    </main>
  );
}
