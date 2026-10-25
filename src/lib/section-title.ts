/** Shared typography for main page section headings (Summary, Skills, Vault, etc.). */
/** Syne display caps — one voice for every section title, whatever case the CMS titles use. */
export const SECTION_TITLE_BASE =
  "font-[family-name:var(--font-syne)] text-[2rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] md:text-5xl";

/** White burning into orange, with a warm glow (and a dark drop for legibility on any backdrop). */
export const SECTION_TITLE_ON_HERO = `${SECTION_TITLE_BASE} w-fit max-w-full bg-gradient-to-r from-white from-40% via-orange-100 to-orange-400 bg-clip-text text-transparent [filter:drop-shadow(0_0_22px_rgba(255,122,40,0.42))_drop-shadow(0_2px_6px_rgba(0,0,0,0.55))]`;

export function sectionTitleClass(toneClass = "text-white title-glow-opposite-light-text"): string {
  return `${SECTION_TITLE_BASE} ${toneClass}`;
}
