"use client";

import { mediaSrcFromBlob } from "@/lib/blob-media";
import { captureVideoFrames, vimeoFrameUrls, youtubeFrameUrls } from "@/lib/highlight-frames";
import { useEffect, useMemo, useState } from "react";

type HighlightFramePickerProps = {
  href: string;
  fileUrl?: string;
  selectedUrl?: string;
  onSelect: (url: string) => void;
};

export function HighlightFramePicker({ href, fileUrl, selectedUrl, onSelect }: HighlightFramePickerProps) {
  const youtubeFrames = useMemo(() => youtubeFrameUrls(href), [href]);
  const vimeoFrames = useMemo(() => (youtubeFrames.length ? [] : vimeoFrameUrls(href)), [href, youtubeFrames.length]);
  const [fileFrames, setFileFrames] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState("");

  useEffect(() => {
    const src = fileUrl?.trim() ? mediaSrcFromBlob(fileUrl) : "";
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
  }, [fileUrl]);

  const frames = fileFrames.length >= 3 ? fileFrames : youtubeFrames.length ? youtubeFrames : vimeoFrames;

  if (capturing) {
    return <p className="text-xs text-zinc-500">Grabbing three frames from the video…</p>;
  }

  if (frames.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        {captureError || "Add a YouTube/Vimeo link or upload a file to pick a thumbnail frame."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Thumbnail frame</p>
      <p className="text-xs text-zinc-500">Choose one of three stills, like YouTube’s auto-generated thumbs.</p>
      <div className="grid grid-cols-3 gap-2">
        {frames.slice(0, 3).map((url, index) => {
          const selected = selectedUrl === url;
          return (
            <button
              key={`${url.slice(0, 48)}-${index}`}
              type="button"
              onClick={() => onSelect(url)}
              className={`overflow-hidden rounded-lg border text-left ${
                selected
                  ? "border-orange-500 ring-2 ring-orange-500/40"
                  : "border-zinc-700 hover:border-zinc-500"
              }`}
            >
              <img src={url} alt={`Frame ${index + 1}`} className="aspect-[9/16] w-full object-cover" />
              <span className="block px-1.5 py-1 text-center text-[10px] text-zinc-400">
                {selected ? "Selected" : `Frame ${index + 1}`}
              </span>
            </button>
          );
        })}
      </div>
      {frames.length < 3 ? (
        <p className="text-xs text-zinc-500">
          YouTube and uploaded files give three frames. Vimeo links show the default still unless you also upload the
          file.
        </p>
      ) : null}
    </div>
  );
}
