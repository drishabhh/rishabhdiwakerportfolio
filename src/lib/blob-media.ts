/** Pathnames this site is allowed to stream from the private Blob store. */
export function isAllowedBlobPathname(pathname: string): boolean {
  const p = pathname.replace(/^\/+/, "").split("?")[0] ?? "";
  if (!p || p.includes("..")) return false;
  return (
    p.startsWith("portfolio/highlights/") ||
    p.startsWith("portfolio/favicon") ||
    p === "portfolio/resume.pdf"
  );
}

export function pathnameFromBlobUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith(".blob.vercel-storage.com")) return null;
    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    return pathname || null;
  } catch {
    return null;
  }
}

export function mediaSrcFromPathname(pathname: string): string {
  return `/api/media/blob?pathname=${encodeURIComponent(pathname.replace(/^\/+/, ""))}`;
}

/** Turn a Blob URL/pathname into a same-origin src the gallery and admin can play. */
export function mediaSrcFromBlob(input: string | { url?: string; pathname?: string }): string {
  if (typeof input !== "string") {
    const path = input.pathname?.trim();
    if (path && isAllowedBlobPathname(path)) return mediaSrcFromPathname(path);
    if (input.url?.trim()) return mediaSrcFromBlob(input.url);
    return "";
  }

  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/api/media/blob") || trimmed.startsWith("/uploads/") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const fromUrl = pathnameFromBlobUrl(trimmed);
  if (fromUrl && isAllowedBlobPathname(fromUrl)) return mediaSrcFromPathname(fromUrl);
  if (isAllowedBlobPathname(trimmed)) return mediaSrcFromPathname(trimmed);
  return trimmed;
}
