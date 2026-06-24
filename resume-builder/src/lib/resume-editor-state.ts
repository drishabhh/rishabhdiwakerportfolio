import type { MasterResume } from "@/lib/resumeData";
import { isFieldFormatEmpty, type TextAlign } from "@/lib/field-format-style";
import {
  applyLayoutToResume,
  REFERENCE_RESUME_LAYOUT,
  type ResumeLayout,
} from "@/lib/resume-layout-reference";

export type { TextAlign };

export type ResumeSectionId =
  | "summary"
  | "achievements"
  | "experience-left"
  | "experience-right"
  | "skills"
  | "certifications"
  | "education";

export type FieldFormat = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  bullet?: boolean;
  align?: TextAlign;
  lineHeight?: number;
  paragraphSpacing?: number;
  highlightColor?: string;
  shading?: string;
  textBox?: boolean;
};

export type LinkField = "email" | "website" | "linkedin";

export type LinkConfig = {
  url: string;
  enabled: boolean;
  label: string;
};

export type PhotoSettings = {
  dataUrl?: string;
  posX: number;
  posY: number;
  scale: number;
};

export type PageDesign = {
  pageBackgroundColor: string;
  pageBorderRadius: number;
  photoBorderRadius: number;
  accentColor: string;
  textColor: string;
  mutedColor: string;
};

export const A4_WIDTH_PT = 595;
export const A4_HEIGHT_PT = 842;

export const DEFAULT_PAGE_DESIGN: PageDesign = {
  pageBackgroundColor: "#ffffff",
  pageBorderRadius: 0,
  photoBorderRadius: 50,
  accentColor: "#7B2CBF",
  textColor: "#111111",
  mutedColor: "#3f3f3f",
};

export type ResumeEditorExtras = {
  links: Record<LinkField, LinkConfig>;
  fieldFormats: Record<string, FieldFormat>;
  sectionOrder: {
    left: ResumeSectionId[];
    right: ResumeSectionId[];
  };
  photo: PhotoSettings;
  design: PageDesign;
  showGrid: boolean;
};

export type EditorSnapshot = {
  resume: MasterResume;
  layout: ResumeLayout;
  extras: ResumeEditorExtras;
};

export const SECTION_LABELS: Record<ResumeSectionId, string> = {
  summary: "Summary",
  achievements: "Key Achievements",
  "experience-left": "Experience (left)",
  "experience-right": "Experience (right)",
  skills: "Skills",
  certifications: "Certification",
  education: "Education",
};

export function createDefaultExtras(resume: MasterResume): ResumeEditorExtras {
  const websiteUrl = resume.website.startsWith("http")
    ? resume.website
    : `https://${resume.website}`;

  return {
    links: {
      email: {
        url: `mailto:${resume.email}`,
        enabled: true,
        label: resume.email,
      },
      website: {
        url: websiteUrl,
        enabled: true,
        label: resume.website,
      },
      linkedin: {
        url: resume.linkedin.startsWith("http")
          ? resume.linkedin
          : `https://${resume.linkedin}`,
        enabled: true,
        label: "LinkedIn",
      },
    },
    fieldFormats: {},
    sectionOrder: {
      left: ["summary", "achievements", "experience-left"],
      right: ["experience-right", "skills", "certifications", "education"],
    },
    photo: { posX: 50, posY: 35, scale: 1.15 },
    design: { ...DEFAULT_PAGE_DESIGN },
    showGrid: false,
  };
}

export function createEditorSnapshot(resume: MasterResume): EditorSnapshot {
  const layout = { ...REFERENCE_RESUME_LAYOUT };
  const fitted = applyLayoutToResume(resume, layout);
  return {
    resume: fitted,
    layout,
    extras: createDefaultExtras(fitted),
  };
}

export function getFieldFormat(
  extras: ResumeEditorExtras,
  fieldId: string,
): FieldFormat {
  return extras.fieldFormats[fieldId] ?? {};
}

export function mergeFieldFormat(
  extras: ResumeEditorExtras,
  fieldId: string,
  patch: Partial<FieldFormat>,
): ResumeEditorExtras {
  const current = getFieldFormat(extras, fieldId);
  const next: FieldFormat = { ...current };

  for (const [key, value] of Object.entries(patch) as [keyof FieldFormat, unknown][]) {
    if (value === undefined || value === "") {
      delete next[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
  }

  const fieldFormats = { ...extras.fieldFormats };
  if (isFieldFormatEmpty(next)) {
    delete fieldFormats[fieldId];
  } else {
    fieldFormats[fieldId] = next;
  }
  return { ...extras, fieldFormats };
}

export function moveSection(
  order: ResumeEditorExtras["sectionOrder"],
  sectionId: ResumeSectionId,
  targetColumn: "left" | "right",
  targetIndex: number,
): ResumeEditorExtras["sectionOrder"] {
  const left = order.left.filter((id) => id !== sectionId);
  const right = order.right.filter((id) => id !== sectionId);

  if (targetColumn === "left") {
    left.splice(targetIndex, 0, sectionId);
  } else {
    right.splice(targetIndex, 0, sectionId);
  }

  return { left, right };
}

export function resolvePhotoSrc(
  snapshot: EditorSnapshot,
  fallback?: string,
): string | undefined {
  if (snapshot.extras.photo.dataUrl) return snapshot.extras.photo.dataUrl;
  if (fallback) return fallback;
  if (snapshot.resume.photoUrl.startsWith("http")) return snapshot.resume.photoUrl;
  return snapshot.resume.photoUrl;
}
