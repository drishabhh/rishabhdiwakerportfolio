export function youtubeVideoIdFromUrl(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = parsed.searchParams.get("v");
      if (v) return v;
      const embedMatch = parsed.pathname.match(/^\/embed\/([^/?]+)/);
      if (embedMatch?.[1]) return embedMatch[1];
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shortsMatch?.[1]) return shortsMatch[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function youtubeThumbnailFromUrl(url: string): string {
  const id = youtubeVideoIdFromUrl(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
}
