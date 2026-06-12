"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, useEffect, useState, type ReactNode } from "react";

const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Fonts rotate as words rotate (no repeated word holds). */
const TRANSITION_FONT_VARS = [
  "var(--font-syne)",
  "var(--font-space-mono)",
  "var(--font-bungee-outline)",
  "var(--font-unifraktur-maguntia)",
  "var(--font-dotgothic16)",
] as const;

const NUM_FONTS = TRANSITION_FONT_VARS.length;

function fontVarForIndex(i: number): string {
  return TRANSITION_FONT_VARS[i % NUM_FONTS] ?? TRANSITION_FONT_VARS[0];
}

export type TextLoopProps = {
  /** Milliseconds between each word step. */
  interval?: number;
  children: ReactNode;
  className?: string;
};

/**
 * Cycles words one-by-one (no repeated word frames), while rotating fonts.
 * Blur/slide + shiver on each step.
 */
export function TextLoop({ interval = 2000, children, className }: TextLoopProps) {
  const items = Children.toArray(children).filter(Boolean);
  const [stepIndex, setStepIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || items.length === 0) return;

    const id = window.setInterval(() => {
      setStepIndex((s) => (s + 1) % Math.max(items.length, 1));
    }, interval);
    return () => window.clearInterval(id);
  }, [interval, items.length, prefersReducedMotion]);

  const w = prefersReducedMotion ? 0 : stepIndex % items.length;
  const f = prefersReducedMotion ? 0 : stepIndex % NUM_FONTS;
  const current = items[w] ?? items[0];
  const fontFamily = fontVarForIndex(f);

  const enterOpacity = 0.055;
  const enterMove = 0.075;
  const enterBlur = 0.06;
  const shiverDur = 0.14;

  if (items.length === 0) {
    return null;
  }

  if (prefersReducedMotion) {
    return (
      <span className={className}>
        <span
          className="inline-block w-full text-center"
          style={{ fontFamily }}
        >
          {current}
        </span>
      </span>
    );
  }

  return (
    <span className={className}>
      <motion.span
        key={`${w}-${f}`}
        initial={{ opacity: 0, y: 8, x: 0, filter: "blur(5px)" }}
        animate={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          x: [0, -7, 7, -6, 6, -5, 5, -3, 3, -2, 2, 0],
        }}
        transition={{
          opacity: { duration: enterOpacity, ease: cinematicEase },
          filter: { duration: enterBlur, ease: cinematicEase },
          y: { duration: enterMove, ease: cinematicEase },
          x: { duration: shiverDur, ease: "linear", delay: 0.04 },
        }}
        className="inline-block w-full text-center will-change-transform"
        style={{ fontFamily }}
      >
        {current}
      </motion.span>
    </span>
  );
}
