/** Same-origin proxy (see next.config rewrites). Avoids Safari/ad-blockers blocking vercel.com. */
const BLOB_API = "/api/admin/highlight-blob";

function storeIdFromClientToken(token: string): string {
  const [, , , storeId = ""] = token.split("_");
  return storeId;
}

export async function requestHighlightUploadToken(pathname: string, contentType: string, size: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch("/api/admin/highlight-video", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pathname, contentType, size }),
      signal: controller.signal,
    });
    const data = (await res.json()) as { clientToken?: string; error?: string };
    if (!res.ok || !data.clientToken) {
      throw new Error(data.error || "Could not start upload");
    }
    return data.clientToken;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Timed out starting the upload. Check BLOB_READ_WRITE_TOKEN on Vercel and retry.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export function xhrPutHighlightToBlob(
  pathname: string,
  file: File,
  contentType: string,
  clientToken: string,
  onProgress: (percent: number) => void,
): Promise<string> {
  const storeId = storeIdFromClientToken(clientToken);
  const url = `${BLOB_API}/?${new URLSearchParams({ pathname }).toString()}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.timeout = 15 * 60 * 1000;
    xhr.responseType = "text";
    xhr.setRequestHeader("authorization", `Bearer ${clientToken}`);
    xhr.setRequestHeader("x-api-version", "12");
    xhr.setRequestHeader("x-vercel-blob-access", "public");
    xhr.setRequestHeader("x-content-type", contentType);
    xhr.setRequestHeader("x-content-length", String(file.size));
    if (storeId) xhr.setRequestHeader("x-vercel-blob-store-id", storeId);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100))));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as { url?: string };
          if (!parsed.url) throw new Error("Blob did not return a URL");
          onProgress(100);
          resolve(parsed.url);
        } catch (error) {
          reject(error instanceof Error ? error : new Error("Invalid Blob response"));
        }
        return;
      }

      let detail = `Upload failed (${xhr.status})`;
      try {
        const parsed = JSON.parse(xhr.responseText) as { error?: { message?: string } };
        if (parsed.error?.message) detail = parsed.error.message;
      } catch {
        if (xhr.responseText) detail = xhr.responseText.slice(0, 280);
      }
      reject(new Error(detail));
    };

    xhr.onerror = () => {
      reject(
        new Error(
          "Upload did not go through. Paste a Vimeo URL instead, or retry on Wi-Fi with a smaller file (under 100 MB).",
        ),
      );
    };
    xhr.ontimeout = () => reject(new Error("Upload timed out. Compress the video under 100 MB and retry."));
    xhr.send(file);
  });
}
