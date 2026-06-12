import { isAdminAuthenticated } from "@/lib/auth";
import { mergeContent, readContent, writeContent, type SiteContent } from "@/lib/content";
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
  } catch {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }
}
