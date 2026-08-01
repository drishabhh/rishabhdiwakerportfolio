"use client";

import { useReducedMotion } from "framer-motion";
import { ReactLenis } from "lenis/react";
import { useEffect, useState, type ReactNode } from "react";

const LENIS_OPTIONS = {
  lerp: 0.135,
  duration: 1,
  smoothWheel: true,
  wheelMultiplier: 1.22,
  touchMultiplier: 1.18,
  autoRaf: true,
} as const;

const DESKTOP_LENIS_QUERY = "(min-width: 768px) and (pointer: fine)";

type SmoothScrollProviderProps = {
  children: ReactNode;
};

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [enableLenis, setEnableLenis] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia(DESKTOP_LENIS_QUERY);
    const sync = () => setEnableLenis(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!mounted || reducedMotion || !enableLenis) {
    return children;
  }

  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
