/**
 * Per-keyword bold support for resume text fields.
 * Wrap a word/phrase in **double asterisks** — both preview and PDF render it bold.
 */

export type BoldSpan = { text: string; bold: boolean };

const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;

/** Splits "Drove **40% growth** in retention" into typed spans. */
export function splitBoldSpans(value: string): BoldSpan[] {
  if (!value) return [{ text: "", bold: false }];
  const spans: BoldSpan[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  BOLD_PATTERN.lastIndex = 0;
  while ((match = BOLD_PATTERN.exec(value)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ text: value.slice(lastIndex, match.index), bold: false });
    }
    spans.push({ text: match[1] ?? "", bold: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < value.length) {
    spans.push({ text: value.slice(lastIndex), bold: false });
  }
  return spans.length > 0 ? spans : [{ text: value, bold: false }];
}

/** True if the field actually contains any **bold** markers. */
export function hasBoldSpans(value: string): boolean {
  return /\*\*[^*]+\*\*/.test(value ?? "");
}

/** Strips ** markers for length/measurement (word budget, page fit). */
export function stripBoldMarkers(value: string): string {
  return (value ?? "").replace(/\*\*([^*]+)\*\*/g, "$1");
}
