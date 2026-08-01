"use client";

import dynamic from "next/dynamic";
import { ScrollParallaxHeroBg } from "@/components/scroll-parallax-hero-bg";

const HeroWebGLScene = dynamic(
  () => import("@/components/hero-webgl-scene").then((mod) => mod.HeroWebGLScene),
  { ssr: false },
);

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
  desktopObjectPosition = "-48px center",
  blurred,
  hidden,
  useWebGL,
}: HeroBackgroundProps) {
  if (useWebGL) {
    return (
      <HeroWebGLScene
        imageSrc={desktopSrc}
        objectPosition={desktopObjectPosition}
        blurred={blurred}
        hidden={hidden}
      />
    );
  }

  return (
    <ScrollParallaxHeroBg
      desktopSrc={desktopSrc}
      mobileSrc={mobileSrc}
      mobileObjectPosition={mobileObjectPosition}
      desktopObjectPosition={desktopObjectPosition}
      blurred={blurred}
      hidden={hidden}
    />
  );
}
