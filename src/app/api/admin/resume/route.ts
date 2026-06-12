import { isAdminAuthenticated } from "@/lib/auth";
import { readContent, writeContent } from "@/lib/content";
import { hasBlobStorage, RESUME_BLOB_PATH, writeBlobFile } from "@/lib/content-storage";
import { storageSetupHint } from "@/lib/github-content";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const downloadNameRaw = formData.get("downloadName");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Upload a PDF file only" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "PDF must be 5 MB or smaller" }, { status: 400 });
    }

    const downloadName =
      typeof downloadNameRaw === "string" && downloadNameRaw.trim()
        ? downloadNameRaw.trim().replace(/[^\w.\-() ]+/g, "").replace(/\s+/g, "-")
        : "Rishabh-Diwaker-CV.pdf";

    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeUrl: string | undefined;

    if (hasBlobStorage()) {
      try {
        resumeUrl = await writeBlobFile(RESUME_BLOB_PATH, buffer, "application/pdf");
      } catch {
        /* fall through */
      }
    }

    if (!resumeUrl) {
      if (process.env.VERCEL === "1") {
        return NextResponse.json(
          {
            error:
              "Resume upload needs Vercel Blob on production. " +
              storageSetupHint().replace(/^Configure /, "Configure "),
          },
          { status: 503 },
        );
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      const filename = "resume.pdf";
      await writeFile(path.join(uploadDir, filename), buffer);
      resumeUrl = `/uploads/${filename}`;
    }

    const content = await readContent();
    content.resume = { url: resumeUrl, downloadName };
    await writeContent(content);

    return NextResponse.json({ url: resumeUrl, downloadName });
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
