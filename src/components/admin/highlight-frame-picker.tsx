"use client";

import { mediaSrcFromBlob } from "@/lib/blob-media";
import { captureVideoFrames, customHighlightPoster, vimeoFrameUrls, youtubeFrameUrls } from "@/lib/highlight-frames";
import { youtubeThumbnailFromUrl } from "@/lib/youtube";
import { useEffect, useMemo, useRef, useState } from "react";

type HighlightFramePickerProps = {
  href: string;
  fileUrl?: string;
  selectedUrl?: string;
  uploading?: boolean;
  onSelect: (url: string) => void;
  onUpload: (file: File) => void;
};

export function HighlightFramePicker({
  href,
  fileUrl,
  selectedUrl,
  uploading,
  onSelect,
  onUpload,
}: HighlightFramePickerProps) {
  const youtubeOfficial = useMemo(() => youtubeThumbnailFromUrl(href), [href]);
  const youtubeFrames = useMemo(() => youtubeFrameUrls(href), [href]);
  const vimeoFrames = useMemo(() => (youtubeFrames.length ? [] : vimeoFrameUrls(href)), [href, youtubeFrames.length]);
  const [fileFrames, setFileFrames] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const customThumb = customHighlightPoster(selectedUrl);

  useEffect(() => {
    const src = fileUrl?.trim() && !youtubeOfficial ? mediaSrcFromBlob(fileUrl) : "";
    if (!src) {
      setFileFrames([]);
      setCaptureError("");
      return;
    }

    let cancelled = false;
    setCapturing(true);
    setCaptureError("");
    captureVideoFrames(src, 3)
      .then((frames) => {
        if (!cancelled) setFileFrames(frames);
      })
      .catch((error) => {
        if (!cancelled) setCaptureError(error instanceof Error ? error.message : "Could not grab frames");
      })
      .finally(() => {
        if (!cancelled) setCapturing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fileUrl, youtubeOfficial]);

  const frames = fileFrames.length >= 3 ? fileFrames : youtubeFrames.length ? youtubeFrames : vimeoFrames;
  const customIsFrame = Boolean(customThumb && frames.includes(selectedUrl || ""));

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Custom thumbnail</p>
        <p className="text-xs text-zinc-500">
          YouTube videos use the original YouTube thumbnail unless you upload a replacement. JPG, PNG, or WebP, 2 MB
          max.
        </p>
        {customThumb && !customIsFrame ? (
          <img
            src={customThumb}
            alt="Uploaded thumbnail"
            className="h-28 w-20 rounded-lg border border-orange-500 object-cover ring-2 ring-orange-500/40"
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUpload(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-orange-700/60 bg-orange-950/30 px-3 py-2 text-xs text-orange-200 hover:bg-orange-950/50 disabled:opacity-50"
          >
            {uploading ? "Uploading thumbnail…" : customThumb ? "Replace thumbnail" : "Upload thumbnail"}
          </button>
          {customThumb ? (
            <button
              type="button"
              onClick={() => onSelect("")}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800"
            >
              Remove thumbnail
            </button>
          ) : null}
        </div>
      </div>

      {capturing ? <p className="text-xs text-zinc-500">Grabbing three frames from the video…</p> : null}

      {!capturing && frames.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            {youtubeOfficial ? "YouTube thumbnail" : "Or pick a frame"}
          </p>
          <p className="text-xs text-zinc-500">
            {youtubeOfficial
              ? "This is the original thumbnail from YouTube. Leave it unless you want a custom image."
              : "Auto stills from the video. Skip these if they look bad."}
          </p>
          <div className={`grid gap-2 ${youtubeOfficial ? "grid-cols-1 max-w-[7.5rem]" : "grid-cols-3"}`}>
            {frames.slice(0, youtubeOfficial ? 1 : 3).map((url, index) => {
              const isOfficial = Boolean(youtubeOfficial && url === youtubeOfficial);
              const selected = isOfficial ? !customThumb || selectedUrl === url : selectedUrl === url;
              return (
                <button
                  key={`${url.slice(0, 48)}-${index}`}
                  type="button"
                  onClick={() => onSelect(isOfficial ? "" : url)}
                  className={`overflow-hidden rounded-lg border text-left ${
                    selected
                      ? "border-orange-500 ring-2 ring-orange-500/40"
                      : "border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <img src={url} alt={isOfficial ? "YouTube thumbnail" : `Frame ${index + 1}`} className="aspect-[9/16] w-full object-cover" />
                  <span className="block px-1.5 py-1 text-center text-[10px] text-zinc-400">
                    {isOfficial ? (selected ? "Original" : "YouTube") : selected ? "Selected" : `Frame ${index + 1}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : !capturing && captureError ? (
        <p className="text-xs text-zinc-500">{captureError}</p>
      ) : null}
    </div>
  );
}
