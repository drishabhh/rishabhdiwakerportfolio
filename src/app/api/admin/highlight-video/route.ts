import { isAdminAuthenticated } from "@/lib/auth";
import { hasBlobStorage, HIGHLIGHT_VIDEO_BLOB_PREFIX, writeBlobFile } from "@/lib/content-storage";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export const maxDuration = 60;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "application/octet-stream",
] as const;

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const SERVERLESS_FALLBACK_MAX = 4 * 1024 * 1024; // Vercel request body limit

function extensionForType(type: string, filename: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName === "webm" || fromName === "mov" || fromName === "mp4" || fromName === "m4v") {
    return fromName === "m4v" ? "mp4" : fromName;
  }
  if (type === "video/webm") return "webm";
  if (type === "video/quicktime") return "mov";
  return "mp4";
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as HandleUploadBody;

      if (body.type === "blob.generate-client-token") {
        if (!(await isAdminAuthenticated())) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }

      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: [...ALLOWED_VIDEO_TYPES],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          allowOverwrite: true,
        }),
      });
      return NextResponse.json(jsonResponse);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Upload failed" },
        { status: 400 },
      );
    }
  }

  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > SERVERLESS_FALLBACK_MAX) {
      return NextResponse.json(
        {
          error:
            "This file is too large to upload through the server. Direct Blob upload is required (check BLOB_READ_WRITE_TOKEN).",
        },
        { status: 413 },
      );
    }

    const mime = file.type || "video/mp4";
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extensionForType(mime, file.name);
    const filename = `highlight-${Date.now()}.${ext}`;

    if (hasBlobStorage()) {
      try {
        const url = await writeBlobFile(
          `${HIGHLIGHT_VIDEO_BLOB_PREFIX}/${filename}`,
          buffer,
          mime,
        );
        return NextResponse.json({ url });
      } catch {
        /* fall through to local disk in development */
      }
    }

    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        { error: "Video storage is not configured. Set BLOB_READ_WRITE_TOKEN on Vercel." },
        { status: 503 },
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "highlights");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    return NextResponse.json({ url: `/uploads/highlights/${filename}` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
