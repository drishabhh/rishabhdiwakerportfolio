"use client";

import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { motion, useSpring } from "framer-motion";
import { HireMeButton, type HireGlide } from "@/components/hire-me-fx";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const magnetSpring = { stiffness: 220, damping: 16, mass: 0.6 };
const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* Typewriter timing: uneven key strokes feel typed by a person, deletes are quick. */
const TYPE_MIN_MS = 38;
const TYPE_JITTER_MS = 55;
const DELETE_MS = 18;
const HOLD_MS = 1900;
const START_MS = 700;

export type HeroPromptCtaProps = {
  /** Lines that type themselves into the bar, one after another. */
  prompts: string[];
  tools: string[];
  visible: boolean;
  /** Orange button text. */
  hireLabel?: string;
  /** Optional link for the button; empty means onHireClick (scroll to Contact). */
  hireHref?: string;
  onHireClick?: (glide: HireGlide) => void;
  onHoverChange?: (hovered: boolean) => void;
};

/**
 * Home CTA styled as an AI prompt bar: real briefs type themselves like a
 * typewriter, line after line, and the orange button hires you. Typing is not
 * a motion effect, so it also runs when the visitor's OS asks for reduced
 * motion. The first line is in the server HTML as full text.
 */
export function HeroPromptCta({
  prompts,
  tools,
  visible,
  hireLabel = "Hire me",
  hireHref = "",
  onHireClick,
  onHoverChange,
}: HeroPromptCtaProps) {
  const reduced = useReducedMotionSafe();
  const list = prompts.map((p) => p.trim()).filter(Boolean);
  const [text, setText] = useState(list[0] ?? "");
  const pullX = useSpring(0, magnetSpring);
  const pullY = useSpring(0, magnetSpring);

  useEffect(() => {
    if (list.length === 0 || !visible) return;
    let cancelled = false;
    let timer = 0;
    let index = 0;
    let chars = list[0].length;
    let phase: "hold" | "delete" | "type" = "hold";

    const step = () => {
      if (cancelled) return;
      const current = list[index];
      if (phase === "hold") {
        phase = "delete";
        timer = window.setTimeout(step, HOLD_MS);
        return;
      }
      if (phase === "delete") {
        chars -= 1;
        setText(current.slice(0, Math.max(0, chars)));
        if (chars <= 0) {
          index = (index + 1) % list.length;
          phase = "type";
          timer = window.setTimeout(step, 260);
          return;
        }
        timer = window.setTimeout(step, DELETE_MS);
        return;
      }
      const next = list[index];
      chars += 1;
      setText(next.slice(0, chars));
      if (chars >= next.length) phase = "hold";
      const ch = next[chars - 1];
      const pause = ch === " " || ch === "," ? 40 : 0;
      timer = window.setTimeout(step, TYPE_MIN_MS + Math.random() * TYPE_JITTER_MS + pause);
    };

    timer = window.setTimeout(step, START_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, list.join("\u0000")]);

  const label = hireLabel.trim() || "Hire me";
  const buttonClass =
    "hero-hire-btn shrink-0 rounded-xl bg-orange-500 px-3.5 py-2 text-[12px] font-semibold text-black shadow-[0_8px_22px_rgba(249,115,22,0.45)] transition-[background-color] duration-200 hover:bg-orange-400 md:px-5 md:py-2.5 md:text-[14px]";

  return (
    <motion.div
      initial={false}
      animate={
        reduced
          ? { opacity: visible ? 1 : 0 }
          : visible
            ? { opacity: 1, filter: "blur(0px)", y: 0 }
            : { opacity: 0, filter: "blur(6px)", y: 8 }
      }
      transition={reduced ? { duration: 0.25 } : { duration: 0.6, delay: visible ? 0.7 : 0, ease: cinematicEase }}
      className="pointer-events-auto mx-auto flex w-full max-w-[min(92vw,560px)] flex-col items-stretch gap-2.5 md:gap-3 lg:max-w-[min(50vw,560px)]"
    >
      <motion.div
        style={{ x: pullX, y: pullY }}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse" || reduced) return;
          const rect = event.currentTarget.getBoundingClientRect();
          pullX.set((event.clientX - (rect.left + rect.width / 2)) * 0.04);
          pullY.set((event.clientY - (rect.top + rect.height / 2)) * 0.2);
        }}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => {
          pullX.set(0);
          pullY.set(0);
          onHoverChange?.(false);
        }}
        className="hero-prompt-bar group relative flex items-center gap-2.5 rounded-2xl border border-white/25 bg-black/45 py-1.5 pl-3 pr-1.5 text-white shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[border-color,background-color] duration-200 hover:border-orange-400/60 hover:bg-black/55 md:gap-3 md:py-2 md:pl-4 md:pr-2"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />
        <span
          className="min-w-0 flex-1 truncate text-left font-mono text-[11px] leading-snug text-white/90 md:text-[13px]"
          aria-label={list.join(". ")}
        >
          <span className="text-white/45" aria-hidden>
            &gt;{" "}
          </span>
          <span aria-hidden>{list.length ? text : ""}</span>
          <span className="hero-prompt-caret ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[2px] bg-white/85" aria-hidden />
        </span>
        <HireMeButton label={label} href={hireHref} onHire={onHireClick} className={buttonClass} />
      </motion.div>

      {tools.length ? (
        <span className="px-1 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-white/65 md:text-[11px]">
          {tools.join(" · ")}
        </span>
      ) : null}
    </motion.div>
  );
}
