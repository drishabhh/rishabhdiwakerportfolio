"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import { ScrollParallaxHeroBg } from "@/components/scroll-parallax-hero-bg";

const HeroWebGLScene = dynamic(
  () => import("@/components/hero-webgl-scene").then((mod) => mod.HeroWebGLScene),
  { ssr: false, loading: () => null },
);

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
  blurred: boolean;
  hidden?: boolean;
  useWebGL: boolean;
  /** Hold hero at opacity 0 until client mount (avoids CSS flash before WebGL path is chosen). */
  entranceLocked?: boolean;
};

export function HeroBackground({
  desktopSrc,
  mobileSrc,
  mobileObjectPosition,
  desktopObjectPosition = "center",
  blurred,
  hidden = false,
  useWebGL,
  entranceLocked = false,
}: HeroBackgroundProps) {
  const [webglFailed, setWebglFailed] = useState(false);
  const [webglReady, setWebglReady] = useState(false);
  const [mobileLoaded, setMobileLoaded] = useState(false);
  const [desktopLoaded, setDesktopLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  const activeWebGL = useWebGL && !webglFailed;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!activeWebGL) setWebglReady(false);
  }, [activeWebGL]);

  const cssImagesReady = activeWebGL ? mobileLoaded : mobileLoaded && desktopLoaded;
  const cssVisibleOnViewport = !activeWebGL || webglFailed || isMobile;
  const revealCss =
    !entranceLocked && !hidden && cssVisibleOnViewport && cssImagesReady;
  const revealWebGL = !entranceLocked && !hidden && activeWebGL && webglReady;

  return (
    <>
      {activeWebGL ? (
        <WebGLErrorBoundary onFail={() => setWebglFailed(true)}>
          <HeroWebGLScene
            imageSrc={desktopSrc}
            objectPosition={desktopObjectPosition}
            blurred={blurred}
            hidden={hidden}
            reveal={revealWebGL}
            onReady={() => setWebglReady(true)}
          />
        </WebGLErrorBoundary>
      ) : null}
      <ScrollParallaxHeroBg
        desktopSrc={desktopSrc}
        mobileSrc={mobileSrc}
        mobileObjectPosition={mobileObjectPosition}
        desktopObjectPosition={desktopObjectPosition}
        blurred={blurred}
        hidden={hidden}
        reveal={revealCss}
        hideDesktopImage={activeWebGL}
        onMobileLoaded={() => setMobileLoaded(true)}
        onDesktopLoaded={() => setDesktopLoaded(true)}
      />
    </>
  );
}
