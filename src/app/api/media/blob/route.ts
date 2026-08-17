import { isAllowedBlobPathname } from "@/lib/blob-media";
import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("pathname")?.trim() ?? "";
  if (!pathname || !isAllowedBlobPathname(pathname)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    });

    if (!result) {
      return new NextResponse("Not found", { status: 404 });
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    if (result.statusCode !== 200 || !result.stream) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(result.blob.etag ? { ETag: result.blob.etag } : {}),
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
