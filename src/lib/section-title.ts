/** Shared typography for main page section headings (Summary, Skills, Vault, etc.). */
export const SECTION_TITLE_BASE =
  "text-3xl font-bold tracking-[-0.02em] md:text-4xl md:font-extrabold md:tracking-[-0.03em]";

export const SECTION_TITLE_ON_HERO = `${SECTION_TITLE_BASE} text-white title-glow-opposite-light-text`;

export function sectionTitleClass(toneClass = "text-white title-glow-opposite-light-text"): string {
  return `${SECTION_TITLE_BASE} ${toneClass}`;
}
