import { isAdminAuthenticated } from "@/lib/auth";
import { hasBlobStorage, HIGHLIGHT_VIDEO_BLOB_PREFIX, writeBlobFile } from "@/lib/content-storage";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

function extensionForType(type: string): string {
  if (type === "video/webm") return "webm";
  if (type === "video/quicktime") return "mov";
  return "mp4";
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as HandleUploadBody;
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: [...ALLOWED_TYPES],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        }),
        onUploadCompleted: async () => {},
      });
      return NextResponse.json(jsonResponse);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Upload failed" },
        { status: 400 },
      );
    }
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json({ error: "Upload MP4, WebM, or MOV only" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Video must be 100 MB or smaller" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extensionForType(file.type);
    const filename = `highlight-${Date.now()}.${ext}`;

    if (hasBlobStorage()) {
      try {
        const url = await writeBlobFile(
          `${HIGHLIGHT_VIDEO_BLOB_PREFIX}/${filename}`,
          buffer,
          file.type,
        );
        return NextResponse.json({ url });
      } catch {
        /* fall through to local disk */
      }
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
