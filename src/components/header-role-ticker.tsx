"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
const TICK_INTERVAL_MS = 1200;

function parseRoleTitles(tagline: string): string[] {
  return tagline
    .split(/\s*(?:,|&)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

type HeaderRoleTickerProps = {
  tagline: string;
  className?: string;
};

export function HeaderRoleTicker({ tagline, className = "" }: HeaderRoleTickerProps) {
  const titles = useMemo(() => parseRoleTitles(tagline), [tagline]);
  const reduced = Boolean(useReducedMotion());
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced || titles.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % titles.length);
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduced, titles.length]);

  if (titles.length === 0) return null;

  const longest = titles.reduce((a, b) => (a.length > b.length ? a : b), titles[0] ?? "");

  if (reduced || titles.length === 1) {
    return (
      <span className={`block whitespace-nowrap ${className}`} aria-label={tagline}>
        {titles[0]}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-block max-w-full align-bottom ${className}`}
      aria-label={tagline}
    >
      <span className="invisible block whitespace-nowrap leading-none" aria-hidden>
        {longest}
      </span>
      <span className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${titles[index]}-${index}`}
            initial={{ x: "108%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-108%", opacity: 0 }}
            transition={{ duration: 0.22, ease: cinematicEase }}
            className="block whitespace-nowrap leading-none"
          >
            {titles[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
