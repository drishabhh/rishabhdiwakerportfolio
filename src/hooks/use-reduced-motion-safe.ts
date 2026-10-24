"use client";

import { useReducedMotion } from "framer-motion";
import { useHydrated } from "@/hooks/use-hydrated";

/**
 * Framer's useReducedMotion reads matchMedia on the first client render, so
 * reduced-motion visitors hydrate different markup than the server sent.
 * False in the server markup and during hydration, the real preference after.
 */
export function useReducedMotionSafe(): boolean {
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  return hydrated && Boolean(reduced);
}
