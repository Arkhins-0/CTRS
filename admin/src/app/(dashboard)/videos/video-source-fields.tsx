"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { MediaPickerInput } from "@/components/media/media-picker";

/**
 * Video source chooser: YouTube id (with live thumbnail preview from
 * img.youtube.com) or an uploaded file from the media library. Emits plain
 * form fields (provider / externalId / mediaId) for the server action.
 */
export function VideoSourceFields({
  initialProvider,
  initialExternalId,
  fileInitialId,
  fileInitialUrl,
}: {
  initialProvider: "youtube" | "file";
  initialExternalId: string;
  fileInitialId?: string | null;
  fileInitialUrl?: string | null;
}) {
  const [provider, setProvider] = useState<"youtube" | "file">(initialProvider);
  const [externalId, setExternalId] = useState(initialExternalId);

  const ytId = externalId.trim();

  return (
    <div className="space-y-3">
      <Field label="Provider">
        <Select
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as "youtube" | "file")}
        >
          <option value="youtube">YouTube</option>
          <option value="file">Uploaded file</option>
        </Select>
      </Field>

      {provider === "youtube" ? (
        <>
          <Field label="YouTube video ID" hint="The 11-character id from the video URL, e.g. dQw4w9WgXcQ.">
            <Input
              name="externalId"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              maxLength={120}
              placeholder="dQw4w9WgXcQ"
              className="font-mono"
            />
          </Field>
          {ytId ? (
            <div className="border border-warm-grey bg-off-white p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.youtube.com/vi/${encodeURIComponent(ytId)}/hqdefault.jpg`}
                alt={`YouTube thumbnail for ${ytId}`}
                className="max-h-48 w-full object-cover"
              />
              <p className="px-1 py-0.5 text-[11px] text-f1-grey">
                Live YouTube thumbnail — if this looks wrong, check the video id.
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <div>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-f1-grey">
            Video file
          </span>
          <MediaPickerInput
            name="mediaId"
            initialId={fileInitialId}
            initialUrl={fileInitialUrl}
            label="Choose file"
          />
        </div>
      )}
    </div>
  );
}
