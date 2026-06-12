const DEFAULT_REPO = "drishabhh/rishabhdiwakerportfolio";
const CONTENT_FILE = "data/content.json";

function githubHeaders(): HeadersInit | null {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function hasGitHubStorage(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

function repoSlug(): string {
  return process.env.GITHUB_REPO || DEFAULT_REPO;
}

export async function readGitHubText(path: string): Promise<string | null> {
  const headers = githubHeaders();
  if (!headers) return null;

  const res = await fetch(`https://api.github.com/repos/${repoSlug()}/contents/${path}`, {
    headers,
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { content?: string; encoding?: string };
  if (!data.content || data.encoding !== "base64") return null;

  return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
}

export async function writeGitHubText(
  path: string,
  body: string,
  message: string,
): Promise<void> {
  const headers = githubHeaders();
  if (!headers) {
    throw new Error("GITHUB_STORAGE_UNAVAILABLE");
  }

  const getRes = await fetch(`https://api.github.com/repos/${repoSlug()}/contents/${path}`, {
    headers,
    cache: "no-store",
  });

  let sha: string | undefined;
  if (getRes.ok) {
    const existing = (await getRes.json()) as { sha?: string };
    sha = existing.sha;
  }

  const putRes = await fetch(`https://api.github.com/repos/${repoSlug()}/contents/${path}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(body, "utf-8").toString("base64"),
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const err = (await putRes.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || "GitHub write failed");
  }
}

export { CONTENT_FILE as GITHUB_CONTENT_PATH };

export function storageSetupHint(): string {
  return (
    "To enable saving on the live site, add a GitHub token in Vercel: " +
    "Settings → Environment Variables → GITHUB_TOKEN (repo Contents read/write access), then redeploy. " +
    "Alternatively, connect Vercel Blob under Storage."
  );
}
