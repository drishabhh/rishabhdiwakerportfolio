import { parseResumePdf } from "@/lib/parse-resume-pdf";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pdfBase64 = String(body.pdfBase64 || "").trim();

    if (!pdfBase64) {
      return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
    }

    if (pdfBase64.length > 8_000_000) {
      return NextResponse.json({ error: "PDF is too large. Use a file under 5 MB." }, { status: 400 });
    }

    const resume = await parseResumePdf(pdfBase64);
    return NextResponse.json({ resume });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not parse resume PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
