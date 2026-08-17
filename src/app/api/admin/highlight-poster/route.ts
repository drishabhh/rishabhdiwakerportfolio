import { isAdminAuthenticated } from "@/lib/auth";
import { hasBlobStorage, HIGHLIGHT_VIDEO_BLOB_PREFIX, writeBlobFile } from "@/lib/content-storage";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Thumbnail must be 2 MB or smaller" }, { status: 400 });
    }

    const mime = file.type || "image/jpeg";
    const ext = MIME_TO_EXT[mime];
    if (!ext) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WebP image" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `thumb-${Date.now()}.${ext}`;

    if (hasBlobStorage()) {
      try {
        const url = await writeBlobFile(`${HIGHLIGHT_VIDEO_BLOB_PREFIX}/thumbs/${filename}`, buffer, mime);
        return NextResponse.json({ url });
      } catch {
        /* fall through */
      }
    }

    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        { url: `data:${mime};base64,${buffer.toString("base64")}` },
        { status: 200 },
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "highlights", "thumbs");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    return NextResponse.json({ url: `/uploads/highlights/thumbs/${filename}` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Thumbnail upload failed" },
      { status: 500 },
    );
  }
}
