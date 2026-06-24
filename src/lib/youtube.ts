const YOUTUBE_ID_RE = /^[\w-]{11}$/;

/** Strip whitespace, smart quotes, and zero-width chars from pasted dashboard URLs. */
export function normalizeYouTubeHref(raw: string): string {
  return raw
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/\u200B/g, "");
}

function idFromParsedUrl(parsed: URL): string | null {
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0]?.split("?")[0];
    return id && YOUTUBE_ID_RE.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const v = parsed.searchParams.get("v");
    if (v && YOUTUBE_ID_RE.test(v)) return v;
    const pathMatch = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/);
    if (pathMatch?.[1] && YOUTUBE_ID_RE.test(pathMatch[1])) return pathMatch[1];
  }
  return null;
}

function idFromRegexFallback(cleaned: string): string | null {
  if (YOUTUBE_ID_RE.test(cleaned)) return cleaned;
  const match = cleaned.match(
    /(?:v=|\/shorts\/|\/embed\/|\/live\/|youtu\.be\/)([\w-]{11})/,
  );
  return match?.[1] && YOUTUBE_ID_RE.test(match[1]) ? match[1] : null;
}

export function youtubeVideoIdFromUrl(url: string): string | null {
  const cleaned = normalizeYouTubeHref(url);
  if (!cleaned) return null;

  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;

  try {
    const id = idFromParsedUrl(new URL(withProtocol));
    if (id) return id;
  } catch {
    /* try regex fallback below */
  }

  return idFromRegexFallback(cleaned);
}

export function youtubeThumbnailFromUrl(url: string): string {
  const id = youtubeVideoIdFromUrl(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
}
