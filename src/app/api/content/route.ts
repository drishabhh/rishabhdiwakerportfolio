import { isAdminAuthenticated } from "@/lib/auth";
import { mergeContent, readContent, writeContent, type SiteContent } from "@/lib/content";
import { storageSetupHint } from "@/lib/github-content";
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
    if (error instanceof Error && error.message === "STORAGE_UNAVAILABLE") {
      return NextResponse.json(
        { error: storageSetupHint(), code: "STORAGE_UNAVAILABLE" },
        { status: 503 },
      );
    }
    const message = error instanceof Error ? error.message : "Invalid content";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
