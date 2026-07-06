/** Extract a Google Drive file id from common share / open URLs. */
export function googleDriveFileId(url: string): string | null {
  const trimmed = url.trim();
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch?.[1]) return fileMatch[1];

  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch?.[1]) return idMatch[1];

  return null;
}

/** Turn a Drive share link into a direct download URL. */
export function resolveResumeDownloadUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const driveId = googleDriveFileId(trimmed);
  if (driveId) {
    return `https://drive.google.com/uc?export=download&id=${driveId}`;
  }

  return trimmed;
}

export function isExternalResumeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}
