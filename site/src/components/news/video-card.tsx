import { format } from "date-fns";
import { Play } from "lucide-react";
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

/** Uploaded thumbnail → YouTube thumbnail → null (caller falls back to gradient). */
export function videoThumbUrl(
  v: Pick<VideoCardData, "provider" | "externalId" | "thumbnail">,
): string | null {
  const uploaded = mediaUrl(v.thumbnail?.path);
  if (uploaded) return uploaded;
  if (v.provider === "youtube" && v.externalId) {
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

/** Dark video tile: thumbnail, accent play overlay, duration chip, title. */
export function VideoCard({ video }: { video: VideoCardData }) {
  const thumb = videoThumbUrl(video);
  const duration = formatDuration(video.durationSeconds);

  return (
    <Link href={`/video/${video.slug}`} className="group block h-full">
      <article className="chamfer-tr flex h-full flex-col overflow-hidden border border-line bg-surface transition-transform duration-200 group-hover:-translate-y-1">
        <div className="relative aspect-video w-full overflow-hidden bg-panel">
          {thumb ? (
            <Image
              src={thumb}
              alt={video.thumbnail?.alt ?? video.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full" style={placeholderStyle(video.title)} />
          )}

          {/* play icon overlay */}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="chamfer-tr flex h-11 w-11 items-center justify-center bg-accent/90 text-accent-fg transition-transform duration-200 group-hover:scale-110">
              <Play size={20} fill="currentColor" aria-hidden />
            </span>
          </span>

          {duration ? (
            <span className="absolute bottom-2 right-2 bg-page/90 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white">
              {duration}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <h3 className="line-clamp-2 text-sm font-black uppercase leading-snug tracking-tight text-white transition-colors group-hover:text-accent">
            {video.title}
          </h3>
          {video.publishedAt ? (
            <p className="mt-auto pt-1 text-xs font-semibold uppercase tracking-wide text-fg-faint">
              {format(new Date(video.publishedAt), "d MMM yyyy")}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
