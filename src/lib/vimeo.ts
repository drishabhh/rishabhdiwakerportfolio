import { normalizeYouTubeHref, youtubeThumbnailFromUrl, youtubeVideoIdFromUrl } from "@/lib/youtube";

export type VimeoRef = {
  id: string;
  hash?: string;
};

const VIMEO_ID_RE = /^\d{6,12}$/;

export function vimeoFromUrl(url: string): VimeoRef | null {
  const cleaned = normalizeYouTubeHref(url);
  if (!cleaned) return null;

  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;

  try {
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;

    const hashParam = parsed.searchParams.get("h")?.trim() || undefined;
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (host === "player.vimeo.com") {
      const videoIdx = parts.indexOf("video");
      const id = videoIdx >= 0 ? parts[videoIdx + 1] : parts[0];
      if (id && VIMEO_ID_RE.test(id)) return { id, hash: hashParam };
      return null;
    }

    const numeric = parts.find((part) => VIMEO_ID_RE.test(part));
    if (!numeric) return null;
    const idIndex = parts.indexOf(numeric);
    const maybeHash = parts[idIndex + 1];
    const hash =
      hashParam ||
      (maybeHash && /^[a-zA-Z0-9]+$/.test(maybeHash) && !VIMEO_ID_RE.test(maybeHash) ? maybeHash : undefined);
    return { id: numeric, hash };
  } catch {
    const match = cleaned.match(/vimeo\.com\/(?:video\/)?(?:channels\/[^/]+\/)?(\d{6,12})(?:\/([a-zA-Z0-9]+))?/i);
    if (!match?.[1]) return null;
    return { id: match[1], hash: match[2] };
  }
}

export function vimeoEmbedSrc(ref: VimeoRef, muted: boolean): string {
  const params = new URLSearchParams({
    autoplay: "1",
    muted: muted ? "1" : "0",
    loop: "1",
    autopause: "0",
    background: "0",
    controls: "0",
    playsinline: "1",
    dnt: "1",
  });
  if (ref.hash) params.set("h", ref.hash);
  return `https://player.vimeo.com/video/${ref.id}?${params.toString()}`;
}

export function vimeoThumbnailFromUrl(url: string): string {
  const ref = vimeoFromUrl(url);
  return ref ? `https://vumbnail.com/${ref.id}.jpg` : "";
}

export function highlightThumbnailFromUrl(url: string): string {
  return youtubeThumbnailFromUrl(url) || vimeoThumbnailFromUrl(url);
}

export function highlightProviderFromUrl(url: string): "youtube" | "vimeo" | null {
  if (youtubeVideoIdFromUrl(url)) return "youtube";
  if (vimeoFromUrl(url)) return "vimeo";
  return null;
}
