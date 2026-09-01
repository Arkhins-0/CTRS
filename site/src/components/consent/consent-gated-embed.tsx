"use client";

import { useState } from "react";
import { ALLOW_ALL } from "@/lib/consent";
import { writeConsent } from "./cookie-consent";

/**
 * Placeholder that stands in for a third-party embed until the viewer asks
 * for it. The server never renders the iframe without media consent, so the
 * request to YouTube genuinely does not happen — this is the thing that
 * makes the toggle mean something instead of hiding a load that already
 * occurred.
 *
 * Two ways forward, because they are different decisions: play this one
 * video (nothing is stored), or turn embedded media on for good.
 */
export function ConsentGatedEmbed({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-static-10 px-6 text-center">
      <p className="display-s font-medium uppercase text-static-5">Embedded video</p>
      <p className="body-xs max-w-md text-static-5">
        This player is loaded from YouTube, which can see your IP address and store data on your
        device. You chose not to allow embedded media.
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="btn btn-sm btn-brand" onClick={() => setLoaded(true)}>
          Play this video
        </button>
        <button
          type="button"
          className="btn btn-sm btn-stroke"
          onClick={() => {
            writeConsent(ALLOW_ALL);
            setLoaded(true);
          }}
        >
          Always allow
        </button>
      </div>
    </div>
  );
}
