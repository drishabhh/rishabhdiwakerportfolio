"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { Component, useEffect, useState, type ReactNode } from "react";
import { ScrollParallaxHeroBg } from "@/components/scroll-parallax-hero-bg";

const HeroWebGLScene = dynamic(
  () => import("@/components/hero-webgl-scene").then((mod) => mod.HeroWebGLScene),
  { ssr: false, loading: () => null },
);

const CROSSFADE_MS = 900;
const POINTER_RAMP_MS = 500;

class WebGLErrorBoundary extends Component<
  { children: ReactNode; onFail: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export type HeroBackgroundProps = {
  desktopSrc: string;
  mobileSrc: string;
  mobileObjectPosition: string;
  desktopObjectPosition?: string;
  hidden?: boolean;
  useWebGL: boolean;
};

export function HeroBackground({
  desktopSrc,
  mobileSrc,
  mobileObjectPosition,
  desktopObjectPosition = "center",
  hidden = false,
  useWebGL,
}: HeroBackgroundProps) {
  const reduced = useReducedMotion();
  const [webglFailed, setWebglFailed] = useState(false);
  const [webglReady, setWebglReady] = useState(false);
  const [webglRevealed, setWebglRevealed] = useState(false);
  const [crossfadeDone, setCrossfadeDone] = useState(false);
  const activeWebGL = useWebGL && !webglFailed;

  useEffect(() => {
    if (!activeWebGL) {
      setWebglReady(false);
      setWebglRevealed(false);
      setCrossfadeDone(false);
    }
  }, [activeWebGL]);

  const handleWebglReady = () => {
    setWebglReady(true);
    if (reduced) {
      setWebglRevealed(true);
      setCrossfadeDone(true);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setWebglRevealed(true));
    });
  };

  useEffect(() => {
    if (!webglRevealed || crossfadeDone || reduced) return;
    const timer = window.setTimeout(() => setCrossfadeDone(true), CROSSFADE_MS + 80);
    return () => window.clearTimeout(timer);
  }, [webglRevealed, crossfadeDone, reduced]);

  const desktopCssOpacity = activeWebGL && webglRevealed ? 0 : 1;

  return (
    <>
      <ScrollParallaxHeroBg
        desktopSrc={desktopSrc}
        mobileSrc={mobileSrc}
        mobileObjectPosition={mobileObjectPosition}
        desktopObjectPosition={desktopObjectPosition}
        hidden={hidden}
        suppressOnDesktop={activeWebGL && crossfadeDone}
        desktopLayerOpacity={desktopCssOpacity}
        desktopFadeMs={reduced ? 0 : CROSSFADE_MS}
        onDesktopFadeComplete={() => setCrossfadeDone(true)}
      />
      {activeWebGL ? (
        <WebGLErrorBoundary
          onFail={() => {
            setWebglFailed(true);
            setWebglReady(false);
            setWebglRevealed(false);
            setCrossfadeDone(false);
          }}
        >
          <HeroWebGLScene
            imageSrc={desktopSrc}
            objectPosition={desktopObjectPosition}
            hidden={hidden}
            ready={webglReady}
            revealed={webglRevealed}
            interactive={crossfadeDone}
            crossfadeMs={reduced ? 0 : CROSSFADE_MS}
            pointerRampMs={reduced ? 0 : POINTER_RAMP_MS}
            onReady={handleWebglReady}
          />
        </WebGLErrorBoundary>
      ) : null}
    </>
  );
}
