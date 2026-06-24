/** Reference layout profile — matched to Rishabh Diwaker A26E5.pdf (A4, one page). */
export type ResumeLayout = {
  /** Uniform scale applied to the whole content container (text + photo) via CSS transform. */
  contentScale: number;
  /** DOM-measured auto-fit scale (preview binary search). Final scale = contentScale × autoFitScale. */
  autoFitScale?: number;
  spacingScale: number;
  pagePaddingTop: number;
  pagePaddingBottom: number;
  pagePaddingHorizontal: number;
  leftColumnWidthPercent: number;
  rightColumnWidthPercent: number;
  columnGap: number;
  leftExperienceCount: number;
  maxAchievements: number;
  maxBulletsPerRole: number;
  maxSkillsPerGroup: number;
  maxCertDetailChars: number;
  distributeVertically: boolean;
  nameFontSize: number;
  titleFontSize: number;
  bodyFontSize: number;
  sectionHeadingFontSize: number;
  photoSize: number;
  /** Gap between sections inside a column (pt). */
  sectionGap: number;
};

export const REFERENCE_RESUME_LAYOUT: ResumeLayout = {
  contentScale: 1,
  spacingScale: 0.88,
  pagePaddingTop: 20,
  pagePaddingBottom: 20,
  pagePaddingHorizontal: 20,
  leftColumnWidthPercent: 59,
  rightColumnWidthPercent: 41,
  columnGap: 18,
  leftExperienceCount: 3,
  maxAchievements: 4,
  maxBulletsPerRole: 3,
  maxSkillsPerGroup: 6,
  maxCertDetailChars: 175,
  distributeVertically: true,
  nameFontSize: 21,
  titleFontSize: 9.5,
  bodyFontSize: 8.5,
  sectionHeadingFontSize: 9.5,
  photoSize: 62,
  sectionGap: 20,
};

export const REFERENCE_LAYOUT_SPEC = `
REFERENCE RESUME LAYOUT (Rishabh Diwaker A26E5.pdf — match this exactly):
- Page: A4 (595×842pt), single page only, content must fill the page evenly (no large empty bottom gap).
- Margins: ~26pt top/bottom, ~30pt left/right.
- Header: name 21pt purple (#7B2CBF), title 9.5pt bold black, contact row with purple icons, circular photo 62pt top-right.
- Columns: left 59% (Summary → Key Achievements → Experience first 3 roles), right 41% (remaining roles → Skills → Certification → Education).
- Experience: role title purple bold; company left + dates/location right-aligned on same line; bullet points below.
- Section headings: 9.5pt bold uppercase black (SUMMARY, KEY ACHIEVEMENTS, EXPERIENCE, SKILLS, CERTIFICATION, EDUCATION).
- Body text: 8.5pt, line-height ~1.32, dark grey.
- Skills: purple group titles, bullet list (no numbers).
- Vertical rhythm: sections spaced evenly to fill full A4 height (justify space-between in each column).
- Content limits for one page: max 4 achievements, max 3 bullets per role, max 6 skills per group, summary ≤65 words, cert details ≤175 chars.
`;

export function normalizeLayout(raw: unknown): ResumeLayout {
  const d = (raw ?? {}) as Partial<ResumeLayout>;
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  const contentScale = clamp(Number(d.contentScale) || REFERENCE_RESUME_LAYOUT.contentScale, 0.72, 1.05);

  return {
    contentScale,
    ...(d.autoFitScale != null
      ? { autoFitScale: clamp(Number(d.autoFitScale), 0.72, 1.05) }
      : {}),
    spacingScale: clamp(Number(d.spacingScale) || REFERENCE_RESUME_LAYOUT.spacingScale, 0.82, 1.12),
    pagePaddingTop: clamp(Number(d.pagePaddingTop) || REFERENCE_RESUME_LAYOUT.pagePaddingTop, 20, 32),
    pagePaddingBottom: clamp(Number(d.pagePaddingBottom) || REFERENCE_RESUME_LAYOUT.pagePaddingBottom, 20, 32),
    pagePaddingHorizontal:
      clamp(Number(d.pagePaddingHorizontal) || REFERENCE_RESUME_LAYOUT.pagePaddingHorizontal, 20, 36),
    leftColumnWidthPercent:
      clamp(Number(d.leftColumnWidthPercent) || REFERENCE_RESUME_LAYOUT.leftColumnWidthPercent, 55, 63),
    rightColumnWidthPercent:
      clamp(Number(d.rightColumnWidthPercent) || REFERENCE_RESUME_LAYOUT.rightColumnWidthPercent, 37, 45),
    columnGap: clamp(Number(d.columnGap) || REFERENCE_RESUME_LAYOUT.columnGap, 14, 22),
    leftExperienceCount: clamp(Number(d.leftExperienceCount) || REFERENCE_RESUME_LAYOUT.leftExperienceCount, 2, 4),
    maxAchievements: clamp(Number(d.maxAchievements) || REFERENCE_RESUME_LAYOUT.maxAchievements, 3, 5),
    maxBulletsPerRole: clamp(Number(d.maxBulletsPerRole) || REFERENCE_RESUME_LAYOUT.maxBulletsPerRole, 2, 4),
    maxSkillsPerGroup: clamp(Number(d.maxSkillsPerGroup) || REFERENCE_RESUME_LAYOUT.maxSkillsPerGroup, 4, 8),
    maxCertDetailChars:
      clamp(Number(d.maxCertDetailChars) || REFERENCE_RESUME_LAYOUT.maxCertDetailChars, 120, 200),
    distributeVertically: d.distributeVertically !== false,
    nameFontSize: clamp(Number(d.nameFontSize) || REFERENCE_RESUME_LAYOUT.nameFontSize, 18, 24),
    titleFontSize: clamp(Number(d.titleFontSize) || REFERENCE_RESUME_LAYOUT.titleFontSize, 8.5, 10.5),
    bodyFontSize: clamp(Number(d.bodyFontSize) || REFERENCE_RESUME_LAYOUT.bodyFontSize, 7.5, 9.5),
    sectionHeadingFontSize:
      clamp(Number(d.sectionHeadingFontSize) || REFERENCE_RESUME_LAYOUT.sectionHeadingFontSize, 8.5, 10.5),
    photoSize: clamp(Number(d.photoSize) || REFERENCE_RESUME_LAYOUT.photoSize, 52, 72),
    sectionGap: clamp(Number(d.sectionGap) || REFERENCE_RESUME_LAYOUT.sectionGap, 12, 28),
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function clampContentScale(value: number): number {
  return round1(Math.min(1.05, Math.max(0.72, value)));
}

/** Bake contentScale into layout dimensions for PDF (react-pdf does not support CSS transform reliably). */
export function layoutWithBakedContentScale(layout: ResumeLayout): ResumeLayout {
  const s = layout.contentScale ?? 1;
  if (Math.abs(s - 1) < 0.001) return layout;

  return {
    ...layout,
    contentScale: 1,
    spacingScale: round1(layout.spacingScale * s),
    nameFontSize: round1(layout.nameFontSize * s),
    titleFontSize: round1(layout.titleFontSize * s),
    bodyFontSize: round1(layout.bodyFontSize * s),
    sectionHeadingFontSize: round1(layout.sectionHeadingFontSize * s),
    columnGap: round1(layout.columnGap * s),
    photoSize: round1(layout.photoSize * s),
    sectionGap: round1((layout.sectionGap ?? 20) * s),
  };
}

export function applyLayoutToResume<T extends {
  keyAchievements: string[];
  experience: Array<{ bullets: string[] }>;
  skills: Record<string, string[]>;
  certifications: Array<{ detail: string }>;
}>(data: T, layout: ResumeLayout): T {
  return {
    ...data,
    keyAchievements: data.keyAchievements.filter(Boolean).slice(0, layout.maxAchievements),
    experience: data.experience.map((exp) => ({
      ...exp,
      bullets: exp.bullets.filter(Boolean).slice(0, layout.maxBulletsPerRole),
    })),
    skills: Object.fromEntries(
      Object.entries(data.skills).map(([group, items]) => [
        group,
        items.filter(Boolean).slice(0, layout.maxSkillsPerGroup),
      ]),
    ) as T["skills"],
    certifications: data.certifications.map((c) => ({
      ...c,
      detail:
        c.detail.length > layout.maxCertDetailChars
          ? `${c.detail.slice(0, layout.maxCertDetailChars - 1)}…`
          : c.detail,
    })),
  };
}
