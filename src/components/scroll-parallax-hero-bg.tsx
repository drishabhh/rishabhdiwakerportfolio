"use client";

import { useNativePageScrollProgress } from "@/hooks/use-native-scroll-progress";
import { motion, useReducedMotion, useTransform } from "framer-motion";
import Image from "next/image";

type ScrollParallaxHeroBgProps = {
  desktopSrc: string;
  mobileSrc: string;
  mobileObjectPosition: string;
  desktopObjectPosition?: string;
  /** Fade out fixed hero once footer enters view (mobile contact seam). */
  hidden?: boolean;
  /** Hide entire CSS layer on desktop (after crossfade completes). */
  suppressOnDesktop?: boolean;
  /** Desktop CSS hero opacity (crossfade out when WebGL reveals). */
  desktopLayerOpacity?: number;
  desktopFadeMs?: number;
  onDesktopFadeComplete?: () => void;
};

export function ScrollParallaxHeroBg({
  desktopSrc,
  mobileSrc,
  mobileObjectPosition,
  desktopObjectPosition = "center",
  hidden = false,
  suppressOnDesktop = false,
  desktopLayerOpacity = 1,
  desktopFadeMs = 600,
  onDesktopFadeComplete,
}: ScrollParallaxHeroBgProps) {
  const reduced = useReducedMotion();
  const scrollYProgress = useNativePageScrollProgress(!reduced);

  const scale = useTransform(scrollYProgress, [0, 0.45, 1], reduced ? [1, 1, 1] : [1, 1.06, 1.1]);
  const y = useTransform(scrollYProgress, [0, 0.45, 1], reduced ? [0, 0, 0] : [0, -28, -42]);
  const vignetteOpacity = useTransform(scrollYProgress, [0, 0.2, 0.55], [0, 0.12, 0.42]);
  const vignetteY = useTransform(scrollYProgress, [0, 0.5], [0, 20]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-0 min-h-[100dvh] w-screen overflow-hidden transition-opacity ease-[cubic-bezier(0.22,1,0.36,1)] will-change-opacity${suppressOnDesktop ? " md:hidden" : ""}`}
      style={{
        opacity: hidden ? 0 : 1,
      }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          scale,
          y,
        }}
      >
        <div className="absolute inset-0">
          <Image
            src={mobileSrc}
            alt="Hero background portrait"
            fill
            priority
            unoptimized
            className="object-cover md:hidden"
            style={{ objectPosition: mobileObjectPosition }}
            sizes="100vw"
          />
        </div>
        <div
          className="absolute inset-0 hidden transition-opacity ease-[cubic-bezier(0.22,1,0.36,1)] md:block"
          style={{
            opacity: desktopLayerOpacity,
            transitionDuration: `${desktopFadeMs}ms`,
          }}
          onTransitionEnd={(e) => {
            if (e.propertyName === "opacity" && desktopLayerOpacity === 0) {
              onDesktopFadeComplete?.();
            }
          }}
        >
          <div className="absolute inset-0">
            <Image
              src={desktopSrc}
              alt="Hero background portrait"
              fill
              priority
              unoptimized
              className="object-cover object-center"
              style={{ objectPosition: desktopObjectPosition }}
              sizes="100vw"
            />
          </div>
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_80%_65%_at_72%_38%,transparent_0%,rgba(0,0,0,0.1)_55%,rgba(0,0,0,0.32)_100%)]"
            style={{
              opacity: vignetteOpacity,
              y: vignetteY,
            }}
          />
        </div>
      </motion.div>

      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_65%_at_72%_38%,transparent_0%,rgba(0,0,0,0.1)_55%,rgba(0,0,0,0.32)_100%)] md:hidden"
        style={{
          opacity: vignetteOpacity,
          y: vignetteY,
        }}
      />
    </div>
  );
}
