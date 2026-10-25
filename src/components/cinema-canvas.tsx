"use client";

import { useNativePageScrollProgress } from "@/hooks/use-native-scroll-progress";
import { motion, useMotionValueEvent, useTransform } from "framer-motion";
import { useRef } from "react";

/* Static film grain, rasterised once as a tiled background (no per-frame cost). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Leaves a faint ghost of the photo behind the dark sections. */
const MAX_DARKNESS = 0.88;

/* Module-level (stable) so useTransform never recomputes — and emits — during a render. */
function darknessAt(progress: number): number {
  if (typeof window === "undefined") return 0;
  const vh = window.innerHeight;
  const scrollY = progress * Math.max(1, document.documentElement.scrollHeight - vh);
  return Math.min(1, Math.max(0, (scrollY - vh * 0.3) / (vh * 0.55))) * MAX_DARKNESS;
}

/**
 * Below the hero, the photo fades into a black, grainy "edit suite" canvas (and back again on the
 * way up). Sits between the fixed background and the content; reports when it fully covers the
 * photo so the WebGL hero can stop rendering frames nobody can see.
 */
export function CinemaCanvas({ onCoveredChange }: { onCoveredChange?: (covered: boolean) => void }) {
  const progress = useNativePageScrollProgress(true);
  const coveredRef = useRef(false);

  const darkness = useTransform(progress, darknessAt);

  useMotionValueEvent(darkness, "change", (value) => {
    const covered = value >= MAX_DARKNESS - 0.005;
    if (covered === coveredRef.current) return;
    coveredRef.current = covered;
    // Deferred: the parent's state must never be set while a component is rendering.
    queueMicrotask(() => onCoveredChange?.(covered));
  });

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] bg-[#08080a]"
      style={{ opacity: darkness, backgroundImage: GRAIN }}
    >
      {/* Warm key light from the top and an ember in the far corner, so the dark reads as a lit set. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(255,122,40,0.12),transparent_70%),radial-gradient(ellipse_55%_45%_at_100%_100%,rgba(255,77,0,0.08),transparent_70%)]" />
    </motion.div>
  );
}
