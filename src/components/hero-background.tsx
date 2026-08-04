"use client";

import dynamic from "next/dynamic";
import { Component, useState, type ReactNode } from "react";
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
};

export function HeroBackground({
  desktopSrc,
  mobileSrc,
  mobileObjectPosition,
  desktopObjectPosition = "center",
  blurred,
  hidden,
  useWebGL,
}: HeroBackgroundProps) {
  const [webglFailed, setWebglFailed] = useState(false);
  const activeWebGL = useWebGL && !webglFailed;

  return (
    <>
      {activeWebGL ? (
        <WebGLErrorBoundary onFail={() => setWebglFailed(true)}>
          <HeroWebGLScene
            imageSrc={desktopSrc}
            objectPosition={desktopObjectPosition}
            blurred={blurred}
            hidden={hidden}
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
        hideDesktopImage={activeWebGL}
      />
    </>
  );
}
