import type { MasterResume } from "@/lib/resumeData";
import { masterResume } from "@/lib/resumeData";
import { parsePdfWithAi } from "@/lib/ai-client";
import { extractJson } from "@/lib/json-repair";
import { extractPdfText } from "@/lib/pdf-text-extract";
import {
  filterNonemptyCertifications,
  filterNonemptyEducation,
} from "@/lib/resume-preserve";

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => asString(item)).filter(Boolean);
}

export function normalizeMasterResume(raw: unknown): MasterResume {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const skillsRaw = data.skills;
  const skills: Record<string, string[]> = {};
  if (Array.isArray(skillsRaw)) {
    for (const entry of skillsRaw) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const category = asString(row.category);
      const list = asStringArray(row.items);
      if (category && list.length > 0) skills[category] = list;
    }
  } else if (skillsRaw && typeof skillsRaw === "object") {
    for (const [group, items] of Object.entries(skillsRaw as Record<string, unknown>)) {
      const list = asStringArray(items);
      if (group.trim() && list.length > 0) skills[group.trim()] = list;
    }
  }

  const experience = Array.isArray(data.experience)
    ? data.experience.map((item) => {
        const exp = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        return {
          role: asString(exp.role),
          company: asString(exp.company),
          dates: asString(exp.dates),
          location: asString(exp.location),
          bullets: asStringArray(exp.bullets),
        };
      })
    : [];

  const certifications = filterNonemptyCertifications(
    Array.isArray(data.certifications)
      ? data.certifications.map((item) => {
          const cert = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          return {
            title: asString(cert.title),
            detail: asString(cert.detail),
          };
        })
      : [],
  );

  const education = filterNonemptyEducation(
    Array.isArray(data.education)
      ? data.education.map((item) => {
          const edu = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          return {
            degree: asString(edu.degree),
            school: asString(edu.school),
            location: asString(edu.location),
          };
        })
      : [],
  );

  return {
    name: asString(data.name) || "Your Name",
    title: asString(data.title),
    email: asString(data.email),
    website: asString(data.website),
    linkedin: asString(data.linkedin),
    phone: asString(data.phone),
    photoUrl: asString(data.photoUrl),
    summary: asString(data.summary),
    keyAchievements: asStringArray(data.keyAchievements),
    experience: experience.length > 0 ? experience : structuredClone(masterResume.experience),
    skills: Object.keys(skills).length > 0 ? skills : structuredClone(masterResume.skills),
    certifications:
      certifications.length > 0 ? certifications : structuredClone(masterResume.certifications),
    education: education.length > 0 ? education : structuredClone(masterResume.education),
  };
}

export async function parseResumePdf(pdfBase64: string): Promise<MasterResume> {
  const prompt = `Extract this resume into structured JSON. Copy text exactly — do not invent or omit jobs, bullets, skills, certifications, or education entries. Preserve list lengths and section order. Use empty strings for missing optional fields. Set photoUrl to empty string.

CERTIFICATION and EDUCATION sections are required when present on the PDF — copy every certification title, detail paragraph, degree, school, and location verbatim.

For skills, return an array of { "category": string, "items": string[] } objects.

Return JSON with keys: name, title, email, website, linkedin, phone, photoUrl, summary, keyAchievements, experience (array of {role, company, dates, location, bullets}), skills (array of {category, items}), certifications (array of {title, detail}), education (array of {degree, school, location}).`;

  const { text } = await parsePdfWithAi({
    pdfBase64,
    prompt,
    jsonMode: true,
    extractTextFallback: () => extractPdfText(pdfBase64),
  });

  const parsed = extractJson(text);
  return normalizeMasterResume(parsed);
}

/** @deprecated Use parseResumePdf */
export const parseResumePdfWithGemini = parseResumePdf;
