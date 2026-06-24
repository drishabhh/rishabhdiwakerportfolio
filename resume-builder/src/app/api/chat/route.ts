import {
  tailorResumeWithInstruction,
  type FieldFormatPatch,
  type ResumeReplacement,
} from "@/lib/gemini-resume";
import { normalizeMasterResume } from "@/lib/parse-resume-pdf";
import { preserveResumeSections } from "@/lib/resume-preserve";
import type { MasterResume } from "@/lib/resumeData";
import { NextRequest, NextResponse } from "next/server";

type ChatRequestBody = {
  resume: MasterResume;
  instruction: string;
  companyName?: string;
  jobDescription?: string;
  history?: { role: "user" | "assistant"; content: string }[];
};

type ChatResponseBody = {
  resume?: MasterResume;
  replacements?: ResumeReplacement[];
  fieldFormatPatches?: FieldFormatPatch[];
  message?: string;
  error?: string;
};

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ChatResponseBody>({ error: "Invalid request body." }, { status: 400 });
  }

  const instruction = body.instruction?.trim();
  if (!instruction) {
    return NextResponse.json<ChatResponseBody>({ error: "Tell me what to change." }, { status: 400 });
  }
  if (!body.resume) {
    return NextResponse.json<ChatResponseBody>({ error: "No resume to edit." }, { status: 400 });
  }

  try {
    const baseResume = normalizeMasterResume(body.resume);
    const { resume: tailoredResume, replacements, fieldFormatPatches, message } =
      await tailorResumeWithInstruction({
      resume: baseResume,
      instruction,
      companyName: body.companyName,
      jobDescription: body.jobDescription,
      history: body.history ?? [],
    });
    const resume = preserveResumeSections(baseResume, tailoredResume);

    return NextResponse.json<ChatResponseBody>({
      resume,
      replacements,
      fieldFormatPatches,
      message,
    });
  } catch (err) {
    return NextResponse.json<ChatResponseBody>(
      { error: err instanceof Error ? err.message : "AI request failed." },
      { status: 502 },
    );
  }
}
