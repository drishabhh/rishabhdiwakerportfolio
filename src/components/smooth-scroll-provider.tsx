"use client";

import { cancelFrame, frame, type FrameData } from "framer-motion";
import { ReactLenis, type LenisRef } from "lenis/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const LENIS_OPTIONS = {
  lerp: 0.1,
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 1.18,
  /* Stepped from Framer's frame loop below, so scroll-linked motion renders in the same frame. */
  autoRaf: false,
} as const;

const DESKTOP_LENIS_QUERY = "(min-width: 768px) and (pointer: fine)";

type SmoothScrollProviderProps = {
  children: ReactNode;
};

/** Smooth wheel scrolling on mouse/trackpad desktops for everyone; touch keeps native momentum. */
export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const lenisRef = useRef<LenisRef>(null);
  const [mounted, setMounted] = useState(false);
  const [enableLenis, setEnableLenis] = useState(false);
  const active = mounted && enableLenis;

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia(DESKTOP_LENIS_QUERY);
    const sync = () => setEnableLenis(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!active) return;
    const update = ({ timestamp }: FrameData) => lenisRef.current?.lenis?.raf(timestamp);
    frame.update(update, true);
    return () => cancelFrame(update);
  }, [active]);

  if (!active) {
    return children;
  }

  return (
    <ReactLenis root ref={lenisRef} options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
