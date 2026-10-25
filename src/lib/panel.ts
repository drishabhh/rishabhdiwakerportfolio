/**
 * Dark "edit suite" panel shared by the section cards: hairline edge with a warm top light and a
 * deep shadow, glowing orange on hover (callers add their own transition).
 * SURFACE omits the border width for components that set `border` themselves.
 */
export const DARK_PANEL_SURFACE =
  "border-white/[0.09] bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,170,110,0.12),0_24px_60px_-32px_rgba(0,0,0,0.9)] hover:border-orange-400/45 hover:shadow-[inset_0_1px_0_rgba(255,170,110,0.22),0_0_42px_-12px_rgba(255,122,40,0.5),0_24px_60px_-32px_rgba(0,0,0,0.9)]";

export const DARK_PANEL = `border ${DARK_PANEL_SURFACE}`;

export const DARK_PANEL_HOVER =
  "border border-orange-400/45 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,170,110,0.22),0_0_42px_-12px_rgba(255,122,40,0.5),0_28px_70px_-30px_rgba(0,0,0,0.95)]";

/** Glowing orange for small caps labels: card eyebrows, dates, numbers. */
export const ACCENT_LABEL = "text-orange-300 [text-shadow:0_0_12px_rgba(251,146,60,0.55)]";
