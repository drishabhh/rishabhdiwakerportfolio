"use client";

import { useReducedMotion } from "framer-motion";
import { ReactLenis } from "lenis/react";
import { useEffect, useState, type ReactNode } from "react";

const LENIS_OPTIONS = {
  lerp: 0.11,
  duration: 1,
  smoothWheel: true,
  wheelMultiplier: 1.18,
  touchMultiplier: 1.15,
  autoRaf: true,
} as const;

type SmoothScrollProviderProps = {
  children: ReactNode;
};

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || reducedMotion) {
    return children;
  }

  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
