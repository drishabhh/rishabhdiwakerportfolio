import { get, head, put } from "@vercel/blob";

const CONTENT_BLOB_PATH = "portfolio/content.json";
const FAVICON_BLOB_PREFIX = "portfolio/favicon";

export function hasBlobStorage(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.BLOB_STORE_ID ||
      (process.env.VERCEL === "1" && process.env.VERCEL_OIDC_TOKEN),
  );
}

export async function readBlobText(pathname: string): Promise<string | null> {
  if (!hasBlobStorage()) return null;
  try {
    await head(pathname);
    const result = await get(pathname, { access: "public" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return await new Response(result.stream).text();
  } catch {
    return null;
  }
}

export async function writeBlobText(pathname: string, body: string, contentType: string): Promise<void> {
  if (!hasBlobStorage()) {
    throw new Error("BLOB_STORAGE_UNAVAILABLE");
  }
  await put(pathname, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  });
}

export async function writeBlobFile(pathname: string, body: Buffer, contentType: string): Promise<string> {
  if (!hasBlobStorage()) {
    throw new Error("BLOB_STORAGE_UNAVAILABLE");
  }
  const result = await put(pathname, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  });
  return result.url;
}

export { CONTENT_BLOB_PATH, FAVICON_BLOB_PREFIX };
