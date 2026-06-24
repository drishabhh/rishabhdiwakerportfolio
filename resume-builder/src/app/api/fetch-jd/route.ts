import { fetchJobDescription } from "@/lib/fetch-job-description";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = String(body.url || "").trim();

    if (!url) {
      return NextResponse.json({ error: "Job URL is required." }, { status: 400 });
    }

    const result = await fetchJobDescription(url);
    return NextResponse.json({
      text: result.jobDescription,
      companyName: result.companyName,
      warning: result.warning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not extract job description.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
