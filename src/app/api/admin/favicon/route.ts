import { isAdminAuthenticated } from "@/lib/auth";
import { readContent, writeContent } from "@/lib/content";
import { FAVICON_BLOB_PREFIX, hasBlobStorage, writeBlobFile } from "@/lib/content-storage";
import { storageSetupHint } from "@/lib/github-content";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

const MAX_BYTES = 1024 * 1024; // 1 MB

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
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
      return NextResponse.json({ error: "File must be 1 MB or smaller" }, { status: 400 });
    }

    const ext = MIME_TO_EXT[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Use PNG, JPG, WebP, SVG, or ICO" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = MIME_TYPES[ext] || file.type;
    let faviconPath: string | undefined;

    if (hasBlobStorage()) {
      try {
        faviconPath = await writeBlobFile(`${FAVICON_BLOB_PREFIX}.${ext}`, buffer, mime);
      } catch {
        /* fall through to data URL */
      }
    }

    if (!faviconPath) {
      if (process.env.VERCEL === "1") {
        faviconPath = `data:${mime};base64,${buffer.toString("base64")}`;
      } else {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });
        const filename = `favicon.${ext}`;
        await writeFile(path.join(uploadDir, filename), buffer);
        faviconPath = `/uploads/${filename}`;
      }
    }

    const content = await readContent();
    content.seo.favicon = faviconPath;
    await writeContent(content);

    return NextResponse.json({ favicon: faviconPath });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "STORAGE_UNAVAILABLE"
        ? storageSetupHint()
        : error instanceof Error
          ? error.message
          : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
