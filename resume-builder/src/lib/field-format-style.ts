import type { CSSProperties } from "react";
import type { FieldFormat } from "@/lib/resume-editor-state";

export type TextAlign = "left" | "center" | "right" | "justify";

export const FONT_OPTIONS = [
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif", pdf: "Helvetica" },
  { label: "Times", value: "Times New Roman, Times, serif", pdf: "Times-Roman" },
  { label: "Courier", value: "Courier New, Courier, monospace", pdf: "Courier" },
  { label: "Georgia", value: "Georgia, serif", pdf: "Times-Roman" },
] as const;

export function pdfFontFamily(fontFamily?: string): string | undefined {
  if (!fontFamily) return undefined;
  return FONT_OPTIONS.find((f) => f.value === fontFamily)?.pdf ?? "Helvetica";
}

export function isFieldFormatEmpty(format: FieldFormat): boolean {
  return Object.keys(format).length === 0;
}

export function applyHtmlFieldFormat(
  base: CSSProperties,
  format: FieldFormat | undefined,
): CSSProperties {
  const f = format ?? {};
  const bg = f.shading || f.highlightColor;

  return {
    ...base,
    fontWeight: f.bold ? 700 : base.fontWeight,
    fontStyle: f.italic ? "italic" : base.fontStyle,
    textDecoration: f.underline ? "underline" : base.textDecoration,
    fontSize: f.fontSize ?? base.fontSize,
    fontFamily: f.fontFamily ?? base.fontFamily,
    color: f.fontColor ?? base.color,
    textAlign: f.align ?? base.textAlign,
    lineHeight: f.lineHeight ?? base.lineHeight,
    marginBottom: f.paragraphSpacing ?? base.marginBottom,
    backgroundColor: bg ?? base.backgroundColor,
    ...(f.textBox
      ? {
          display: base.display ?? "inline-block",
          border: "1px solid #d4d4d8",
          borderRadius: 2,
          padding: "2px 4px",
        }
      : {}),
  };
}

export type PdfStylePatch = {
  fontWeight?: "bold";
  fontStyle?: "italic";
  textDecoration?: "underline";
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  textAlign?: TextAlign;
  lineHeight?: number;
  marginBottom?: number;
  backgroundColor?: string;
  padding?: number;
  borderWidth?: number;
  borderColor?: string;
};

export function applyPdfFieldFormat(
  base: Record<string, unknown>,
  format: FieldFormat | undefined,
): PdfStylePatch {
  const f = format ?? {};
  const patch: PdfStylePatch = { ...(base as PdfStylePatch) };

  if (f.bold) patch.fontWeight = "bold";
  if (f.italic) patch.fontStyle = "italic";
  if (f.underline) patch.textDecoration = "underline";
  if (f.fontSize) patch.fontSize = f.fontSize;
  if (f.fontFamily) patch.fontFamily = pdfFontFamily(f.fontFamily);
  if (f.fontColor) patch.color = f.fontColor;
  if (f.align) patch.textAlign = f.align;
  if (f.lineHeight) patch.lineHeight = f.lineHeight;
  if (f.paragraphSpacing) patch.marginBottom = f.paragraphSpacing;
  if (f.shading || f.highlightColor) patch.backgroundColor = f.shading || f.highlightColor;
  if (f.textBox) {
    patch.borderWidth = 1;
    patch.borderColor = "#d4d4d8";
    patch.padding = 3;
  }

  return patch;
}
