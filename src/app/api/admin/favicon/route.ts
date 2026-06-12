import { isAdminAuthenticated } from "@/lib/auth";
import { readContent, writeContent } from "@/lib/content";
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

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filename = `favicon.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    const faviconPath = `/uploads/${filename}`;
    const content = await readContent();
    content.seo.favicon = faviconPath;
    await writeContent(content);

    return NextResponse.json({ favicon: faviconPath });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
