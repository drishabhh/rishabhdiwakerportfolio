import type { MasterResume } from "@/lib/resumeData";
import type { FieldFormat } from "@/lib/resume-editor-state";
import { stripBoldMarkers } from "@/lib/resume-bold-spans";
import { callAiChat } from "@/lib/ai-client";
import { extractJson } from "@/lib/json-repair";
import { isProtectedTailorField, preserveResumeSections } from "@/lib/resume-preserve";

export type ResumeReplacement = {
  field: string;
  original: string;
  replacement: string;
  reason: string;
};

export type TailoredResumeResult = {
  resume: MasterResume;
  replacements: ResumeReplacement[];
};

type RawReplacement = {
  field?: string;
  replacement?: string;
  reason?: string;
};

function cloneResume(data: MasterResume): MasterResume {
  return JSON.parse(JSON.stringify(data)) as MasterResume;
}

function parseFieldPath(path: string): Array<string | number> {
  const segments: Array<string | number> = [];
  let i = 0;

  while (i < path.length) {
    if (path[i] === ".") {
      i++;
      continue;
    }
    if (path[i] === "[") {
      const close = path.indexOf("]", i);
      if (close < 0) break;
      const inner = path.slice(i + 1, close);
      if (inner.startsWith('"') && inner.endsWith('"')) {
        try {
          segments.push(JSON.parse(inner) as string);
        } catch {
          segments.push(inner.slice(1, -1));
        }
      } else {
        segments.push(Number(inner));
      }
      i = close + 1;
      continue;
    }

    const nextDot = path.indexOf(".", i);
    const nextBracket = path.indexOf("[", i);
    let end = path.length;
    if (nextDot !== -1 && (nextBracket === -1 || nextDot < nextBracket)) end = nextDot;
    else if (nextBracket !== -1) end = nextBracket;

    segments.push(path.slice(i, end));
    i = end;
  }

  return segments;
}

function getAtPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of parseFieldPath(path)) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[String(part)] ?? (cur as unknown[])[part as number];
  }
  return cur;
}

function setAtPath(obj: MasterResume, path: string, value: string): boolean {
  const parts = parseFieldPath(path);
  if (parts.length === 0) return false;

  let cur: unknown = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (cur == null || typeof cur !== "object") return false;
    cur =
      (cur as Record<string, unknown>)[String(part)] ??
      (cur as unknown[])[part as number];
  }

  const last = parts[parts.length - 1]!;
  if (cur == null || typeof cur !== "object") return false;
  if (typeof last === "number") {
    (cur as unknown[])[last] = value;
  } else {
    (cur as Record<string, unknown>)[last] = value;
  }
  return true;
}

function normalizeFieldPath(field: string): string {
  return field
    .trim()
    .replace(/^masterResume\./, "")
    .replace(/\.(\d+)\./g, "[$1].")
    .replace(/^(\w+)\.(\d+)/, "$1[$2]");
}

function wordCount(text: string): number {
  const trimmed = stripBoldMarkers(text).trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function maxWordsForOriginal(originalWords: number): number {
  if (originalWords <= 0) return 0;
  return Math.max(1, Math.ceil(originalWords * 1.05));
}

/** Trim overlong AI lines so the one-page layout does not overflow. */
function fitToWordBudget(original: string, replacement: string): string {
  const originalWords = wordCount(original);
  const maxWords = maxWordsForOriginal(originalWords);
  const words = replacement.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return replacement.trim();

  const trimmed = words.slice(0, maxWords).join(" ");
  return trimmed.replace(/[,;:\-–—]\s*$/, "").trim();
}

type EditableField = { path: string; text: string; words: number };

function collectEditableFields(base: MasterResume): EditableField[] {
  const fields: EditableField[] = [];

  const push = (path: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    fields.push({ path, text: trimmed, words: wordCount(trimmed) });
  };

  push("title", base.title);
  push("summary", base.summary);

  base.keyAchievements.forEach((line, i) => push(`keyAchievements[${i}]`, line));

  base.experience.forEach((exp, i) => {
    exp.bullets.forEach((bullet, j) => push(`experience[${i}].bullets[${j}]`, bullet));
  });

  for (const [category, items] of Object.entries(base.skills)) {
    items.forEach((item, j) => push(`skills["${category}"][${j}]`, item));
  }

  base.certifications.forEach((cert, i) => push(`certifications[${i}].detail`, cert.detail));

  return fields;
}

function buildLengthGuide(fields: EditableField[]): string {
  if (fields.length === 0) return "";
  const lines = fields.map((f) => `- ${f.path}: ${f.words} words — replacement MUST be ${f.words} words (max ${maxWordsForOriginal(f.words)})`);
  return `\nWORD BUDGET (strict — one-page A4, overflow breaks layout):\n${lines.join("\n")}\n`;
}

const TAILOR_SYSTEM_PROMPT =
  "You output only valid JSON for resume line replacements. Never add or remove resume lines. Every replacement must match the original line's word count (max 5% over). Shorten lines when needed — swap words, do not expand.";

async function fetchReplacementsFromAi(
  baseResume: MasterResume,
  prompt: string,
  retryNote: string,
): Promise<ResumeReplacement[]> {
  let { text } = await callAiChat({
    prompt,
    temperature: 0.2,
    jsonMode: true,
    system: TAILOR_SYSTEM_PROMPT,
  });

  let parsed: { replacements?: unknown };
  try {
    parsed = extractJson(text) as { replacements?: unknown };
  } catch (firstError) {
    ({ text } = await callAiChat({
      prompt: `${prompt}\n\nIMPORTANT: ${retryNote}`,
      temperature: 0.1,
      jsonMode: true,
    }));
    try {
      parsed = extractJson(text) as { replacements?: unknown };
    } catch {
      const message = firstError instanceof Error ? firstError.message : "Invalid JSON from AI";
      throw new Error(message);
    }
  }

  return normalizeReplacements(parsed.replacements, baseResume);
}

const INSTRUCTION_SYSTEM_PROMPT =
  "You output only valid JSON for resume instruction edits. Content edits use replacements; style-only edits use fieldFormatPatches. Never add or remove resume lines.";

async function fetchInstructionResponseFromAi(
  baseResume: MasterResume,
  prompt: string,
  retryNote: string,
): Promise<{ replacements: ResumeReplacement[]; fieldFormatPatches: FieldFormatPatch[] }> {
  let { text } = await callAiChat({
    prompt,
    temperature: 0.2,
    jsonMode: true,
    system: INSTRUCTION_SYSTEM_PROMPT,
  });

  let parsed: { replacements?: unknown; fieldFormatPatches?: unknown };
  try {
    parsed = extractJson(text) as { replacements?: unknown; fieldFormatPatches?: unknown };
  } catch (firstError) {
    ({ text } = await callAiChat({
      prompt: `${prompt}\n\nIMPORTANT: ${retryNote}`,
      temperature: 0.1,
      jsonMode: true,
    }));
    try {
      parsed = extractJson(text) as { replacements?: unknown; fieldFormatPatches?: unknown };
    } catch {
      const message = firstError instanceof Error ? firstError.message : "Invalid JSON from AI";
      throw new Error(message);
    }
  }

  return {
    replacements: normalizeReplacements(parsed.replacements, baseResume),
    fieldFormatPatches: normalizeFieldFormatPatches(parsed.fieldFormatPatches),
  };
}

function finalizeTailoring(
  baseResume: MasterResume,
  replacements: ResumeReplacement[],
): TailoredResumeResult {
  const { resume: tailored, applied } = applyReplacements(baseResume, replacements);
  const resume = preserveResumeSections(baseResume, tailored);
  return { resume, replacements: applied };
}

const REPLACE_ONLY_RULES = `STRICT RULES:
- Do NOT remove any section, job, achievement, bullet, skill, certification, or education entry.
- Do NOT add new sections, jobs, bullets, skills, certifications, or education entries.
- Do NOT change the number of items in any list.
- Do NOT reorder experience entries or skill groups.
- Do NOT invent new jobs, companies, dates, metrics, or tools not already in the resume.
- Do NOT change: name, email, website, linkedin, phone, photoUrl, company names, dates, locations, education fields, or certification titles.
- Never clear or shorten certification detail or education fields to empty text.
- LENGTH IS CRITICAL: each replacement must use the SAME word count as the original line (see WORD BUDGET below). Max 5% over — never more.
- To fit changes, CUT other words in the same line — swap phrases, drop filler, use shorter synonyms. Never grow a line.
- Bullets: keep them tight. Prefer shorter phrasing over adding detail.
- Do not merge or split lines. One original line → one replacement line.
- Return valid JSON only. Do not include the original text in output — only field path, replacement, and reason.
- Use straight double quotes in JSON strings. No markdown, no trailing commas.`;

const REPLACEMENT_JSON_SCHEMA = `Return JSON:
{
  "replacements": [
    {
      "field": "summary",
      "replacement": "new text with same facts",
      "reason": "brief note"
    }
  ]
}

Field path examples:
- title, summary
- keyAchievements[0], keyAchievements[1]
- experience[0].bullets[1], experience[2].bullets[0]
- skills["AI Video & Automation"][2]
- certifications[0].detail

If nothing should change, return { "replacements": [] }.`;

const BOLD_SPAN_RULES = `- BOLD/HIGHLIGHT (in text): wrap specific words in **double asterisks** inside replacement text (e.g. "Drove **40% growth** in retention"). Use ** only when the instruction asks to bold/highlight specific words in the wording — not for field-level styling.`;

const STYLE_COMMAND_RULES = `STYLE COMMANDS (bold, italic, underline, font size, color, alignment on whole fields):
Do NOT change resume text. Return fieldFormatPatches instead of replacements.
Use targetPattern wildcards — never guess numeric field indices.

Allowed targetPattern values ONLY:
  experience.*.company | experience.*.role | experience.*.bullets.*
  education.*.school | education.*.degree | certifications.*.title
  keyAchievements.* | summary | title | name

format fields: bold, italic, underline, fontSize, fontFamily, fontColor, align, lineHeight, highlightColor, shading
fontSizeIsDelta: true when instruction says increase/decrease BY N; false or omit for exact size (e.g. "14pt").`;

const INSTRUCTION_JSON_SCHEMA = `Return JSON:
{
  "replacements": [],
  "fieldFormatPatches": []
}

For CONTENT edits (wording), populate replacements (same rules as generate).
For STYLE edits (no text changes), populate fieldFormatPatches only, e.g.:
  { "targetPattern": "experience.*.company", "format": { "bold": true, "fontSize": 4 }, "fontSizeIsDelta": true }

Most instructions need replacements OR fieldFormatPatches, not both — unless explicitly asked for both.`;

const INSTRUCTION_JSON_RETRY_NOTE =
  "Your previous response was invalid JSON. Return at most 12 replacements and at most 8 fieldFormatPatches. Valid JSON only.";

const JSON_RETRY_NOTE =
  "Your previous response was invalid JSON. Return at most 12 replacements. Each replacement must match the WORD BUDGET exactly — cut words to fit, never exceed. Valid JSON only.";

function normalizeReplacements(raw: unknown, base: MasterResume): ResumeReplacement[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const r = item as RawReplacement;
      const field = normalizeFieldPath(String(r.field || ""));
      const replacement = String(r.replacement || "").trim();
      const reason = String(r.reason || "Updated to match job requirements").trim();
      const originalValue = getAtPath(base, field);
      const original = typeof originalValue === "string" ? originalValue.trim() : "";

      return { field, original, replacement, reason };
    })
    .filter((r) => r.field && r.replacement && r.original && !isProtectedTailorField(r.field));
}

const FIELD_FORMAT_KEYS = new Set([
  "bold",
  "italic",
  "underline",
  "fontSize",
  "fontFamily",
  "fontColor",
  "bullet",
  "align",
  "lineHeight",
  "paragraphSpacing",
  "highlightColor",
  "shading",
  "textBox",
]);

export type FieldFormatPatch = {
  targetPattern: string;
  format: Partial<FieldFormat>;
  fontSizeIsDelta?: boolean;
};

function normalizeFieldFormatPatches(raw: unknown): FieldFormatPatch[] {
  if (!Array.isArray(raw)) return [];

  const patches: FieldFormatPatch[] = [];
  for (const item of raw) {
    const p = item as {
      targetPattern?: string;
      format?: Record<string, unknown>;
      fontSizeIsDelta?: boolean;
    };
    const targetPattern = String(p.targetPattern || "").trim();
    if (!targetPattern) continue;

    const format: Partial<FieldFormat> = {};
    if (p.format && typeof p.format === "object") {
      for (const [key, value] of Object.entries(p.format)) {
        if (!FIELD_FORMAT_KEYS.has(key) || value === undefined) continue;
        (format as Record<string, unknown>)[key] = value;
      }
    }
    if (Object.keys(format).length === 0) continue;

    patches.push({
      targetPattern,
      format,
      fontSizeIsDelta: Boolean(p.fontSizeIsDelta),
    });
  }
  return patches;
}

export function applyReplacements(
  base: MasterResume,
  replacements: ResumeReplacement[],
): { resume: MasterResume; applied: ResumeReplacement[] } {
  const resume = cloneResume(base);
  const applied: ResumeReplacement[] = [];

  for (const rep of replacements) {
    const current = getAtPath(resume, rep.field);
    if (typeof current !== "string") continue;

    if (current.trim() !== rep.original.trim()) continue;

    const fitted = fitToWordBudget(current.trim(), rep.replacement);
    if (setAtPath(resume, rep.field, fitted)) {
      applied.push({ ...rep, replacement: fitted, original: current.trim() });
    }
  }

  resume.photoUrl = base.photoUrl;
  return { resume, applied };
}

export async function tailorResume(input: {
  companyName: string;
  jobDescription: string;
  baseResume: MasterResume;
}): Promise<TailoredResumeResult> {
  const baseResume = input.baseResume;
  const lengthGuide = buildLengthGuide(collectEditableFields(baseResume));

  const prompt = `You tailor a resume for a specific job by REPLACING words and phrases only.

The resume is a FIXED one-page A4 layout (595×842pt). Content must stay on one page — overflow is not allowed.

${REPLACE_ONLY_RULES}
- ONLY replace wording in title, summary, keyAchievements lines, experience bullets, skill names, and certification detail text so the resume reflects keywords from the job description.
- If a line already matches the JD well, omit it from replacements.
${lengthGuide}
Resume JSON:
${JSON.stringify(baseResume)}

Target company: ${input.companyName}

Job description:
"""${input.jobDescription.slice(0, 6000)}"""

${REPLACEMENT_JSON_SCHEMA}`;

  const replacements = await fetchReplacementsFromAi(baseResume, prompt, JSON_RETRY_NOTE);
  return finalizeTailoring(baseResume, replacements);
}

export type TailorInstructionInput = {
  resume: MasterResume;
  instruction: string;
  companyName?: string;
  jobDescription?: string;
  history?: { role: "user" | "assistant"; content: string }[];
};

export type TailorInstructionResult = TailoredResumeResult & {
  message: string;
  fieldFormatPatches: FieldFormatPatch[];
};

export async function tailorResumeWithInstruction(
  input: TailorInstructionInput,
): Promise<TailorInstructionResult> {
  const baseResume = input.resume;
  const instruction = input.instruction.trim();
  const lengthGuide = buildLengthGuide(collectEditableFields(baseResume));

  const historyBlock =
    input.history && input.history.length > 0
      ? `\nConversation so far:\n${input.history
          .slice(-8)
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n")}\n`
      : "";

  const jobContext = [
    input.companyName?.trim() ? `Target company (context only): ${input.companyName.trim()}` : "",
    input.jobDescription?.trim()
      ? `Job description (context only):\n"""${input.jobDescription.trim().slice(0, 4000)}"""`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const prompt = `You edit a resume from a user instruction. Content edits replace wording; style edits change FieldFormat only.

The resume is a FIXED one-page A4 layout (595×842pt). Content must stay on one page — overflow is not allowed.

Apply ONLY the user's instruction below. Do not make unrelated edits.

${REPLACE_ONLY_RULES}
- ONLY change fields needed to satisfy the user instruction.
${BOLD_SPAN_RULES}
${STYLE_COMMAND_RULES}
${lengthGuide}
Resume JSON:
${JSON.stringify(baseResume)}
${historyBlock}
User instruction (apply ONLY this):
"""${instruction.slice(0, 2000)}"""
${jobContext ? `\n${jobContext}\n` : ""}
${INSTRUCTION_JSON_SCHEMA}`;

  const { replacements, fieldFormatPatches } = await fetchInstructionResponseFromAi(
    baseResume,
    prompt,
    INSTRUCTION_JSON_RETRY_NOTE,
  );
  const { resume, replacements: applied } = finalizeTailoring(baseResume, replacements);

  const parts: string[] = [];
  if (applied.length > 0) {
    parts.push(`${applied.length} line${applied.length === 1 ? "" : "s"} updated`);
  }
  if (fieldFormatPatches.length > 0) {
    parts.push(
      `styling applied to ${fieldFormatPatches.map((p) => p.targetPattern).join(", ")}`,
    );
  }

  const message =
    parts.length > 0
      ? `Applied your change — ${parts.join("; ")}.`
      : "No changes were made. Try rephrasing the instruction or pick a specific section.";

  return { resume, replacements: applied, fieldFormatPatches, message };
}

/** @deprecated Use tailorResume */
export const tailorResumeWithGemini = tailorResume;
