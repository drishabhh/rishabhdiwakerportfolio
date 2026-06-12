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

function longestChildText(items: ReturnType<typeof Children.toArray>): string {
  return items.reduce<string>((longest, item) => {
    const text =
      typeof item === "string"
        ? item
        : typeof item === "object" && item !== null && "props" in item
          ? String((item as { props?: { children?: string } }).props?.children ?? "")
          : "";
    return text.length > longest.length ? text : longest;
  }, "");
}

export type TextLoopProps = {
  /** Milliseconds between each word step. */
  interval?: number;
  children: ReactNode;
  className?: string;
  /** Fixed-height slot so word swaps do not shift surrounding layout. */
  stableSlot?: boolean;
  /** Cycle display fonts each step (on by default). */
  rotateFonts?: boolean;
};

/**
 * Cycles words one-by-one (no repeated word frames), optionally rotating fonts.
 */
export function TextLoop({
  interval = 2000,
  children,
  className = "",
  stableSlot = false,
  rotateFonts,
}: TextLoopProps) {
  const items = Children.toArray(children).filter(Boolean);
  const [stepIndex, setStepIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const useRotatingFonts = rotateFonts ?? true;

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
  const fontFamily = useRotatingFonts ? fontVarForIndex(f) : undefined;
  const motionKey = useRotatingFonts ? `${w}-${f}` : `${w}`;

  const enterOpacity = 0.055;
  const enterBlur = 0.06;

  if (items.length === 0) {
    return null;
  }

  if (prefersReducedMotion) {
    return (
      <span className={className}>
        <span className="leading-none" style={fontFamily ? { fontFamily } : undefined}>
          {current}
        </span>
      </span>
    );
  }

  const wordNode = (
    <motion.span
      key={motionKey}
      initial={{ opacity: 0, filter: "blur(5px)" }}
      animate={{
        opacity: 1,
        filter: "blur(0px)",
      }}
      transition={{
        opacity: { duration: enterOpacity, ease: cinematicEase },
        filter: { duration: enterBlur, ease: cinematicEase },
      }}
      className={
        stableSlot
          ? "absolute inset-0 flex items-center justify-center leading-none will-change-[opacity,filter]"
          : "inline-block w-full text-center will-change-[opacity,filter]"
      }
      style={fontFamily ? { fontFamily } : undefined}
    >
      {current}
    </motion.span>
  );

  if (stableSlot) {
    return (
      <span className={`relative inline-block min-h-[1.45em] shrink-0 align-middle leading-none ${className}`}>
        <span aria-hidden className="invisible whitespace-nowrap leading-none">
          {longestChildText(items)}
        </span>
        {wordNode}
      </span>
    );
  }

  return <span className={className}>{wordNode}</span>;
}
