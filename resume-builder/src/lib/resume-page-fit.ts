import type { MasterResume } from "@/lib/resumeData";
import { A4_HEIGHT_PT, A4_WIDTH_PT, type ResumeEditorExtras, type ResumeSectionId } from "@/lib/resume-editor-state";
import { clampContentScale, type ResumeLayout } from "@/lib/resume-layout-reference";
import { filterNonemptyCertifications, filterNonemptyEducation } from "@/lib/resume-preserve";

export const PAGE_MARGIN_PT = 20;
export const SECTION_GAP_PT = 20;
export const PAGE_CONTENT_WIDTH_PT = A4_WIDTH_PT - PAGE_MARGIN_PT * 2;
export const PAGE_CONTENT_HEIGHT_PT = A4_HEIGHT_PT - PAGE_MARGIN_PT * 2;

const LINE_HEIGHT = 1.32;
const HEADER_BODY_GAP_PT = 8;
const OVERFLOW_TOLERANCE_PT = 2;

export type ResumeFitInput = {
  resume: MasterResume;
  layout: ResumeLayout;
  extras?: Pick<ResumeEditorExtras, "sectionOrder">;
};

/** Normalize margins/gaps for measurement — matches the visible page boundary. */
export function layoutForFitMeasurement(layout: ResumeLayout): ResumeLayout {
  return {
    ...layout,
    pagePaddingTop: PAGE_MARGIN_PT,
    pagePaddingBottom: PAGE_MARGIN_PT,
    pagePaddingHorizontal: PAGE_MARGIN_PT,
    sectionGap: layout.sectionGap ?? SECTION_GAP_PT,
    distributeVertically: false,
  };
}

function charsPerLine(widthPt: number, fontSize: number): number {
  return Math.max(18, Math.floor(widthPt / (fontSize * 0.5)));
}

import { stripBoldMarkers } from "@/lib/resume-bold-spans";

function lineCount(text: string, widthPt: number, fontSize: number): number {
  const trimmed = stripBoldMarkers(text).trim();
  if (!trimmed) return 0;
  const cpl = charsPerLine(widthPt, fontSize);
  return trimmed.split(/\n+/).reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / cpl)), 0);
}

function lineHeightPt(fontSize: number): number {
  return fontSize * LINE_HEIGHT;
}

function scaled(layout: ResumeLayout, base: number): number {
  return base * layout.spacingScale;
}

function scalePx(value: number, layout: ResumeLayout): number {
  return value * layout.spacingScale;
}

function sectionGapPt(layout: ResumeLayout): number {
  return layout.sectionGap ?? SECTION_GAP_PT;
}

function estimateHeaderHeight(resume: MasterResume, layout: ResumeLayout, innerWidth: number): number {
  const nameFs = scaled(layout, layout.nameFontSize);
  const titleFs = scaled(layout, layout.titleFontSize);
  const bodyFs = scaled(layout, layout.bodyFontSize);

  const textBlock =
    lineHeightPt(nameFs) +
    scalePx(3, layout) +
    lineCount(resume.title, innerWidth - layout.photoSize - 14, titleFs) * lineHeightPt(titleFs) +
    scalePx(7, layout) +
    lineHeightPt(bodyFs);

  const contact = lineHeightPt(bodyFs);
  const photoH = layout.photoSize;

  return Math.max(textBlock + contact, photoH);
}

function sectionVisible(
  sectionId: ResumeSectionId,
  resume: MasterResume,
  layout: ResumeLayout,
): boolean {
  switch (sectionId) {
    case "experience-right":
      return resume.experience.length > layout.leftExperienceCount;
    case "certifications":
      return filterNonemptyCertifications(resume.certifications).length > 0;
    case "education":
      return filterNonemptyEducation(resume.education).length > 0;
    default:
      return true;
  }
}

function estimateSectionHeight(
  sectionId: ResumeSectionId,
  resume: MasterResume,
  layout: ResumeLayout,
  colWidth: number,
): number {
  const bodyFs = scaled(layout, layout.bodyFontSize);
  const headingFs = scaled(layout, layout.sectionHeadingFontSize);
  const metaFs = scaled(layout, 8);
  const roleFs = scaled(layout, 9);
  const lh = lineHeightPt(bodyFs);
  const headingBlock = headingFs + scalePx(5, layout);

  switch (sectionId) {
    case "summary":
      return headingBlock + lineCount(resume.summary, colWidth, bodyFs) * lh * 1.35;
    case "achievements": {
      const items = resume.keyAchievements.filter(Boolean).slice(0, layout.maxAchievements);
      return (
        headingBlock +
        items.reduce((sum, item) => sum + lineCount(item, colWidth - 8, bodyFs) * lh, 0) +
        items.length * scalePx(3, layout)
      );
    }
    case "experience-left":
    case "experience-right": {
      const exps =
        sectionId === "experience-left"
          ? resume.experience.slice(0, layout.leftExperienceCount)
          : resume.experience.slice(layout.leftExperienceCount);
      if (exps.length === 0) return 0;
      let h = sectionId === "experience-left" ? headingBlock : 0;
      for (const exp of exps) {
        h += lineHeightPt(roleFs) + 2 + lineHeightPt(metaFs) + scalePx(6, layout);
        const bullets = exp.bullets.filter(Boolean).slice(0, layout.maxBulletsPerRole);
        h +=
          bullets.reduce((sum, b) => sum + lineCount(b, colWidth - 8, bodyFs) * lh, 0) +
          bullets.length * scalePx(3, layout);
      }
      return h;
    }
    case "skills": {
      let h = headingBlock;
      for (const [, items] of Object.entries(resume.skills)) {
        h += lh + scalePx(2, layout);
        const list = items.filter(Boolean).slice(0, layout.maxSkillsPerGroup);
        h += list.length * (lh + scalePx(1.5, layout));
        h += scalePx(5, layout);
      }
      return h;
    }
    case "certifications": {
      const certs = filterNonemptyCertifications(resume.certifications);
      if (certs.length === 0) return 0;
      return (
        headingBlock +
        certs.reduce((sum, c) => {
          return (
            sum +
            lh +
            lineCount(c.detail, colWidth, metaFs) * lineHeightPt(metaFs) * 1.3 +
            scalePx(4, layout)
          );
        }, 0)
      );
    }
    case "education": {
      const edu = filterNonemptyEducation(resume.education);
      if (edu.length === 0) return 0;
      return headingBlock + edu.length * (lh + metaFs * 2.5 + scalePx(3, layout));
    }
    default:
      return 0;
  }
}

function estimateColumnHeight(
  sectionIds: ResumeSectionId[],
  resume: MasterResume,
  layout: ResumeLayout,
  colWidth: number,
): number {
  const visible = sectionIds.filter((id) => sectionVisible(id, resume, layout));
  if (visible.length === 0) return 0;

  const heights = visible.map((id) => estimateSectionHeight(id, resume, layout, colWidth));
  const content = heights.reduce((a, b) => a + b, 0);
  const gaps = (visible.length - 1) * sectionGapPt(layout);
  return content + gaps;
}

/**
 * Natural content height in PDF points at scale 1 (current font/spacing settings).
 * Single measurement used by preview and PDF.
 */
export function measureResumeContentHeightPt(input: ResumeFitInput): number {
  const layout = layoutForFitMeasurement(input.layout);
  const innerWidth = PAGE_CONTENT_WIDTH_PT;
  const leftW = innerWidth * (layout.leftColumnWidthPercent / 100);
  const rightW = innerWidth * (layout.rightColumnWidthPercent / 100);

  const sectionOrder = input.extras?.sectionOrder ?? {
    left: ["summary", "achievements", "experience-left"] as ResumeSectionId[],
    right: ["experience-right", "skills", "certifications", "education"] as ResumeSectionId[],
  };

  const headerH = estimateHeaderHeight(input.resume, layout, innerWidth);
  const leftH = estimateColumnHeight(sectionOrder.left, input.resume, layout, leftW);
  const rightH = estimateColumnHeight(sectionOrder.right, input.resume, layout, rightW);
  const columnsH = Math.max(leftH, rightH);

  return headerH + HEADER_BODY_GAP_PT + columnsH;
}

function resolveAutoFitScale(input: ResumeFitInput): number {
  if (input.layout.autoFitScale != null) return input.layout.autoFitScale;

  const naturalHeight = measureResumeContentHeightPt(input);
  if (naturalHeight <= 0) return 1;
  return clampContentScale(PAGE_CONTENT_HEIGHT_PT / naturalHeight);
}

/**
 * Single source of truth for content scale.
 * Uses DOM-measured layout.autoFitScale when set; otherwise estimates from content height.
 * Final scale = layout.contentScale (user slider) × auto-fit scale.
 */
export function computeResumeContentScale(input: ResumeFitInput): number {
  const userScale = input.layout.contentScale ?? 1;
  return clampContentScale(userScale * resolveAutoFitScale(input));
}

/** Scaled content height after computeResumeContentScale — for overflow checks. */
export function measureScaledContentHeightPt(input: ResumeFitInput): number {
  const scale = computeResumeContentScale(input);
  return measureResumeContentHeightPt(input) * scale;
}

export function contentExceedsPageBounds(input: ResumeFitInput): boolean {
  return measureScaledContentHeightPt(input) > PAGE_CONTENT_HEIGHT_PT + OVERFLOW_TOLERANCE_PT;
}

/** @deprecated Use computeResumeContentScale */
export const resolveEffectiveContentScale = computeResumeContentScale;

/** @deprecated Use measureResumeContentHeightPt + computeResumeContentScale */
export const computePageFitScale = (resume: MasterResume, layout: ResumeLayout, extras?: ResumeFitInput["extras"]) =>
  computeResumeContentScale({ resume, layout, extras }) / clampContentScale(layout.contentScale ?? 1);
