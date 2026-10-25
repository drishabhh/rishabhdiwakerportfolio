"use client";

import { scrollVelocity } from "@/lib/scroll-velocity";
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

/**
 * Smooth wheel scrolling on mouse/trackpad desktops for everyone; touch keeps native momentum.
 * Also publishes scroll speed every frame (scrollVelocity) for the velocity effects.
 */
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
    if (!mounted) return;
    let lastScroll = window.scrollY;
    const update = ({ timestamp, delta }: FrameData) => {
      const lenis = active ? lenisRef.current?.lenis : undefined;
      lenis?.raf(timestamp);
      const scroll = lenis?.scroll ?? window.scrollY;
      scrollVelocity.set(delta > 0 ? ((scroll - lastScroll) * 16.67) / delta : 0);
      lastScroll = scroll;
    };
    frame.update(update, true);
    return () => cancelFrame(update);
  }, [mounted, active]);

  if (!active) {
    return children;
  }

  return (
    <ReactLenis root ref={lenisRef} options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
