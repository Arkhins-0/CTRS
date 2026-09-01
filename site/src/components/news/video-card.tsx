import Image from "next/image";
import Link from "next/link";
import { mediaUrl, placeholderStyle } from "@/lib/media";

export type VideoCardData = {
  slug: string;
  title: string;
  provider: "youtube" | "file";
  externalId: string | null;
  durationSeconds: number | null;
  publishedAt: Date | string | null;
  thumbnail?: { path: string; alt: string | null } | null;
};

/**
 * Uploaded thumbnail → YouTube thumbnail → null (caller falls back to
 * gradient).
 *
 * `allowThirdParty` is the media consent answer. The YouTube branch is a
 * request to img.youtube.com, which hands Google the viewer's IP and
 * referrer, so without consent it is skipped and the card uses its
 * gradient. Our own uploaded thumbnails are first-party and unaffected.
 */
export function videoThumbUrl(
  v: Pick<VideoCardData, "provider" | "externalId" | "thumbnail">,
  allowThirdParty = true,
): string | null {
  const uploaded = mediaUrl(v.thumbnail?.path);
  if (uploaded) return uploaded;
  if (allowThirdParty && v.provider === "youtube" && v.externalId) {
    return `https://img.youtube.com/vi/${v.externalId}/hqdefault.jpg`;
  }
  return null;
}

/** mm:ss duration chip text. */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Circular play chip: 2px white ring over a blurred dark disc. */
function PlayChip() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-black/30 text-white backdrop-blur-[5px]">
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3 translate-x-px fill-current">
        <path d="M4 2.5v11l9-5.5z" />
      </svg>
    </span>
  );
}

/**
 * F1.com 2026 video card: 16:9 rounded thumbnail with a bottom gradient,
 * play chip + duration pill inside the image, Titillium title below.
 * Width is set by the parent (rail item or grid cell).
 */
export function VideoCard({
  video,
  sizes = "(max-width: 735px) 80vw, 314px",
}: {
  video: VideoCardData;
  sizes?: string;
}) {
  const thumb = videoThumbUrl(video);
  const duration = formatDuration(video.durationSeconds);

  return (
    <article className="group relative flex flex-col gap-3">
      <span className="relative block aspect-video overflow-clip rounded-md">
        {thumb ? (
          <Image
            src={thumb}
            alt={video.thumbnail?.alt ?? video.title}
            fill
            sizes={sizes}
            className="card-img object-cover"
          />
        ) : (
          <span className="absolute inset-0" style={placeholderStyle(video.title)} />
        )}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,#131110)]"
        />
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
          <PlayChip />
          {duration ? (
            <span className="body-2xs rounded-sm bg-black/40 px-1 pb-px font-semibold text-white">
              {duration}
            </span>
          ) : null}
        </span>
      </span>
      <Link
        href={`/video/${video.slug}`}
        className="body-s font-semibold text-current after:absolute after:inset-0 group-hover:underline md:text-[1.0625rem] md:leading-6"
      >
        {video.title}
      </Link>
    </article>
  );
}

/** Video grid for the /video hub and related sections (2 → 3 → 4 columns). */
export function VideoGrid({ videos }: { videos: (VideoCardData & { id: string })[] }) {
  if (!videos.length) return null;
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6 min-[1696px]:grid-cols-4">
      {videos.map((v) => (
        <li key={v.id}>
          <VideoCard video={v} sizes="(max-width: 735px) 50vw, 33vw" />
        </li>
      ))}
    </ul>
  );
}
