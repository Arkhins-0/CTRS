import { VideoCard, type VideoCardData } from "@/components/news/video-card";
import { BandHeading } from "./band";

/* ── Band 2 · dark video rail ──────────────────────────────────────────────
   Fluid band: the heading sits in the normal page gutter while the rail
   bleeds to the viewport edge, its padding-inline matching the gutter so the
   first card still lines up with the grid. Cards are 250 → 218 → 314px wide,
   snap-start, with the striped "more content" filler closing the track. ──── */

export type RailVideo = VideoCardData & { id: string };

export function VideoRailBand({
  title,
  videos,
  viewAllHref = "/video",
  dark = true,
}: {
  title: string;
  videos: RailVideo[];
  viewAllHref?: string;
  /** Set false to render the rail on the white surface (video detail page). */
  dark?: boolean;
}) {
  if (!videos.length) return null;

  return (
    <section className={dark ? "dark-section bg-surface-3" : "bg-surface-1"}>
      <div className="flex flex-col gap-4 py-6 lg:gap-6 md:py-8">
        <div className="f1-inner">
          <BandHeading viewAllHref={viewAllHref}>{title}</BandHeading>
        </div>

        <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 py-1 scrollbar-none md:px-8 lg:gap-4 lg:px-12 min-[1696px]:px-[calc((100%-1600px)/2)]">
          {videos.map((v) => (
            <li
              key={v.id}
              className="w-[250px] shrink-0 snap-start md:w-[218px] lg:w-[314px]"
            >
              <VideoCard video={v} sizes="(max-width: 1069px) 250px, 314px" />
            </li>
          ))}
          {/* End-of-rail candy-stripe filler */}
          <li
            aria-hidden
            className="h-[141px] min-w-[120px] flex-1 shrink-0 opacity-40 md:h-[123px] lg:h-[177px]"
          >
            <span className="ml-2 block h-full rounded-md bg-[repeating-linear-gradient(135deg,var(--f1-surface-4),var(--f1-surface-4)_16px,transparent_16px,transparent_32px)] lg:ml-4" />
          </li>
        </ul>
      </div>
    </section>
  );
}
