import { tailorResume } from "@/lib/gemini-resume";
import { normalizeMasterResume } from "@/lib/parse-resume-pdf";
import { preserveResumeSections } from "@/lib/resume-preserve";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const companyName = String(body.companyName || "").trim();
    const jobDescription = String(body.jobDescription || "").trim();

    if (!companyName || !jobDescription) {
      return NextResponse.json(
        { error: "Company name and job description are required." },
        { status: 400 },
      );
    }

    if (!body.baseResume || typeof body.baseResume !== "object") {
      return NextResponse.json({ error: "Upload your resume first." }, { status: 400 });
    }

    const baseResume = normalizeMasterResume(body.baseResume);
    const { resume: tailoredResume, replacements } = await tailorResume({
      companyName,
      jobDescription,
      baseResume,
    });
    const resume = preserveResumeSections(baseResume, tailoredResume);

    const changes = replacements.map((r) => ({
      section: r.field,
      change: r.reason,
    }));
    const tailored = replacements.length > 0;

    return NextResponse.json({
      resume,
      replacements,
      tailored,
      changes,
      message: tailored
        ? `Resume tailored for ${companyName} — ${replacements.length} line${replacements.length === 1 ? "" : "s"} replaced. Fixed one-page A4 layout preserved.`
        : "No replacements needed — your resume already matches this job description well.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
