import { isAdminAuthenticated } from "@/lib/auth";
import { mergeContent, readContent, writeContent, type SiteContent } from "@/lib/content";
import { hasBlobStorage } from "@/lib/content-storage";
import { NextResponse } from "next/server";

export async function GET() {
  const content = await readContent();
  return NextResponse.json(content);
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<SiteContent>;
    const content = mergeContent(body);
    await writeContent(content);
    return NextResponse.json(content);
  } catch (error) {
    if (error instanceof Error && error.message === "FILE_STORAGE_UNAVAILABLE") {
      return NextResponse.json(
        {
          error: hasBlobStorage()
            ? "Could not save content."
            : "Saving requires Vercel Blob storage. In your Vercel project go to Storage → Create Blob store → connect it to this project, then redeploy.",
          code: "STORAGE_UNAVAILABLE",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }
}
