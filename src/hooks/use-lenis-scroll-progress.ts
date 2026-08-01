"use client";

import { useLenis } from "lenis/react";
import { useMotionValue, type MotionValue } from "framer-motion";
import { useEffect, type RefObject } from "react";

function nativePageProgress() {
  const limit = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return window.scrollY / limit;
}

/** Page-wide scroll progress (0 at top → 1 at bottom), synced to Lenis every frame. */
export function useLenisPageScrollProgress(enabled: boolean): MotionValue<number> {
  const progress = useMotionValue(0);

  useLenis(
    (lenis) => {
      if (!enabled) return;
      const limit = Math.max(1, lenis.limit);
      progress.set(lenis.scroll / limit);
    },
    [enabled],
    1,
  );

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    const tick = () => {
      if (!document.documentElement.classList.contains("lenis")) {
        progress.set(nativePageProgress());
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, progress]);

  return progress;
}

/**
 * Section scroll progress synced to Lenis.
 * Mirrors Framer offset: start 0.92 → end 0.15 through the element.
 */
export function useLenisSectionScrollProgress(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): MotionValue<number> {
  const progress = useMotionValue(0);

  const measure = () => {
    const el = ref.current;
    if (!el) return;

    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();
    const start = vh * 0.92;
    const end = vh * 0.15;
    const travel = start + rect.height - end;
    const current = start - rect.top;
    const p = travel > 0 ? Math.min(1, Math.max(0, current / travel)) : 0;
    progress.set(p);
  };

  useLenis(
    () => {
      if (!enabled) return;
      measure();
    },
    [enabled],
    1,
  );

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    const tick = () => {
      if (!document.documentElement.classList.contains("lenis")) {
        measure();
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, progress]);

  return progress;
}
