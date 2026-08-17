import { isAdminAuthenticated } from "@/lib/auth";
import { hasBlobStorage, HIGHLIGHT_VIDEO_BLOB_PREFIX, writeBlobFile } from "@/lib/content-storage";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 100 * 1024 * 1024;
const SERVERLESS_FALLBACK_MAX = 4 * 1024 * 1024;

function extensionForName(filename: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName === "webm" || fromName === "mov" || fromName === "mp4" || fromName === "m4v") {
    return fromName === "m4v" ? "mp4" : fromName;
  }
  return "mp4";
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as {
        pathname?: string;
        contentType?: string;
        size?: number;
      };

      const pathname = body.pathname?.trim();
      if (!pathname || !pathname.startsWith("portfolio/highlights/")) {
        return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
      }

      if (typeof body.size === "number" && body.size > MAX_BYTES) {
        return NextResponse.json({ error: "Video must be 100 MB or smaller" }, { status: 400 });
      }

      const clientToken = await generateClientTokenFromReadWriteToken({
        pathname,
        allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/*"],
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: true,
        allowOverwrite: true,
        validUntil: Date.now() + 60 * 60 * 1000,
      });

      return NextResponse.json({ clientToken, pathname });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start upload";
      const needsToken = /read-write token|BLOB_READ_WRITE_TOKEN/i.test(message);
      return NextResponse.json(
        {
          error: needsToken
            ? "BLOB_READ_WRITE_TOKEN is missing on Vercel. Add it in Project → Settings → Environment Variables, then redeploy."
            : message,
        },
        { status: needsToken ? 503 : 400 },
      );
    }
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > SERVERLESS_FALLBACK_MAX) {
      return NextResponse.json(
        { error: "File is too large for server upload. Direct Blob upload is required." },
        { status: 413 },
      );
    }

    const mime = file.type || "video/mp4";
    const ext = extensionForName(file.name);
    const filename = `highlight-${Date.now()}.${ext}`;

    if (hasBlobStorage()) {
      try {
        const url = await writeBlobFile(`${HIGHLIGHT_VIDEO_BLOB_PREFIX}/${filename}`, Buffer.from(await file.arrayBuffer()), mime);
        return NextResponse.json({ url });
      } catch {
        /* fall through */
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
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url: `/uploads/highlights/${filename}` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
