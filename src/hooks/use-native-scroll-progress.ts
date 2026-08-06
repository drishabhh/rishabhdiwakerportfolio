"use client";

import { useLenis } from "lenis/react";
import { useMotionValue, type MotionValue } from "framer-motion";
import { useEffect, useRef, type RefObject } from "react";

function nativePageProgress() {
  const limit = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return window.scrollY / limit;
}

/** Page-wide scroll progress (0 at top → 1 at bottom), synced to Lenis or native scroll. */
export function useNativePageScrollProgress(enabled: boolean): MotionValue<number> {
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
    const measure = () => progress.set(nativePageProgress());

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!document.documentElement.classList.contains("lenis")) {
          measure();
        }
      });
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled, progress]);

  return progress;
}

/**
 * Section scroll progress synced to Lenis or native scroll.
 * Mirrors Framer offset: start 0.92 → end 0.15 through the element.
 * Skips measurement when the section is off-screen to reduce scroll jank.
 */
export function useNativeSectionScrollProgress(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): MotionValue<number> {
  const progress = useMotionValue(0);
  const isNearViewport = useRef(true);

  const measure = () => {
    if (!isNearViewport.current) return;

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

  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isNearViewport.current = entry.isIntersecting;
        if (entry.isIntersecting) measure();
      },
      { rootMargin: "40% 0px 40% 0px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, ref]);

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
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!document.documentElement.classList.contains("lenis")) {
          measure();
        }
      });
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled, progress, ref]);

  return progress;
}
