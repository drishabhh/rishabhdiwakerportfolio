import { highlightThumbnailFromUrl, vimeoFromUrl } from "@/lib/vimeo";
import { normalizeYouTubeHref, youtubeVideoIdFromUrl } from "@/lib/youtube";

/**
 * Turns whatever the admin pasted or uploaded into something the site can play
 * in place: an uploaded/direct file, or an embeddable player for YouTube,
 * Instagram, Vimeo or Google Drive.
 */
export type VideoSource =
  | { kind: "file"; src: string }
  | { kind: "youtube"; id: string }
  | { kind: "vimeo"; id: string; hash?: string }
  | { kind: "instagram"; code: string; type: "reel" | "p" | "tv" }
  | { kind: "drive"; id: string };

const FILE_RE = /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i;

export function videoSourceFrom(href?: string, fileUrl?: string): VideoSource | null {
  const file = fileUrl?.trim();
  if (file) return { kind: "file", src: file };

  const raw = normalizeYouTubeHref(href ?? "");
  if (!raw) return null;

  const yt = youtubeVideoIdFromUrl(raw);
  if (yt) return { kind: "youtube", id: yt };

  const vimeo = vimeoFromUrl(raw);
  if (vimeo) return { kind: "vimeo", id: vimeo.id, hash: vimeo.hash };

  const insta = raw.match(/instagram\.com\/(?:[\w.]+\/)?(reels?|p|tv)\/([\w-]+)/i);
  if (insta?.[2]) {
    const t = insta[1]!.toLowerCase();
    return { kind: "instagram", code: insta[2], type: t.startsWith("reel") ? "reel" : t === "tv" ? "tv" : "p" };
  }

  const drive = raw.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/i);
  if (drive?.[1]) return { kind: "drive", id: drive[1] };

  if (FILE_RE.test(raw) || raw.startsWith("/uploads/") || raw.startsWith("/api/media/")) {
    return { kind: "file", src: raw };
  }
  return null;
}

/** Iframe URL for embeddable sources (null for files). */
export function embedSrc(source: VideoSource, opts: { muted: boolean; controls: boolean }): string | null {
  switch (source.kind) {
    case "youtube": {
      const p = new URLSearchParams({
        autoplay: "1",
        mute: opts.muted ? "1" : "0",
        playsinline: "1",
        loop: "1",
        playlist: source.id,
        controls: opts.controls ? "1" : "0",
        rel: "0",
        modestbranding: "1",
        enablejsapi: "1",
      });
      if (typeof window !== "undefined") p.set("origin", window.location.origin);
      return `https://www.youtube.com/embed/${source.id}?${p.toString()}`;
    }
    case "vimeo": {
      const p = new URLSearchParams({
        autoplay: "1",
        muted: opts.muted ? "1" : "0",
        loop: "1",
        autopause: "0",
        playsinline: "1",
        controls: opts.controls ? "1" : "0",
        dnt: "1",
      });
      if (source.hash) p.set("h", source.hash);
      return `https://player.vimeo.com/video/${source.id}?${p.toString()}`;
    }
    case "instagram":
      return `https://www.instagram.com/${source.type}/${source.code}/embed`;
    case "drive":
      return `https://drive.google.com/file/d/${source.id}/preview`;
    default:
      return null;
  }
}

/** True when the site can switch sound on/off itself (files, YouTube, Vimeo). */
export function canToggleSound(source: VideoSource): boolean {
  return source.kind === "file" || source.kind === "youtube" || source.kind === "vimeo";
}

/** Poster to show on a tile: custom poster, else the platform thumbnail, else "" (file frames are drawn by <video>). */
export function videoPosterFrom(href?: string, posterUrl?: string): string {
  const poster = posterUrl?.trim();
  if (poster) return poster;
  return highlightThumbnailFromUrl(href ?? "");
}

export function videoSourceLabel(source: VideoSource | null): string {
  if (!source) return "No playable video";
  switch (source.kind) {
    case "file":
      return "Video file";
    case "youtube":
      return `YouTube (${source.id})`;
    case "vimeo":
      return `Vimeo (${source.id})`;
    case "instagram":
      return `Instagram ${source.type === "p" ? "post" : "reel"} (${source.code})`;
    case "drive":
      return "Google Drive";
  }
}
