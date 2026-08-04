"use client";

import { useNativePageScrollProgress } from "@/hooks/use-native-scroll-progress";
import { motion, useMotionTemplate, useReducedMotion, useTransform } from "framer-motion";
import Image from "next/image";

type ScrollParallaxHeroBgProps = {
  desktopSrc: string;
  mobileSrc: string;
  mobileObjectPosition: string;
  desktopObjectPosition?: string;
  blurred: boolean;
  /** Fade out fixed hero once footer enters view (mobile contact seam). */
  hidden?: boolean;
  /** Hide desktop image when WebGL hero is active */
  hideDesktopImage?: boolean;
};

export function ScrollParallaxHeroBg({
  desktopSrc,
  mobileSrc,
  mobileObjectPosition,
  desktopObjectPosition = "center",
  blurred,
  hidden = false,
  hideDesktopImage = false,
}: ScrollParallaxHeroBgProps) {
  const reduced = useReducedMotion();
  const scrollYProgress = useNativePageScrollProgress(!reduced);

  const scale = useTransform(scrollYProgress, [0, 0.45, 1], reduced ? [1, 1, 1] : [1, 1.06, 1.1]);
  const y = useTransform(scrollYProgress, [0, 0.45, 1], reduced ? [0, 0, 0] : [0, -28, -42]);
  const brightness = useTransform(scrollYProgress, [0, 0.35, 0.7], [1.16, 1.1, 1.02]);
  const contrast = useTransform(scrollYProgress, [0, 0.35, 0.7], [1.05, 1.03, 1]);
  const saturate = useTransform(scrollYProgress, [0, 0.35, 0.7], [1.06, 1.04, 1]);
  const vignetteOpacity = useTransform(scrollYProgress, [0, 0.2, 0.55], [0, 0.12, 0.42]);
  const vignetteY = useTransform(scrollYProgress, [0, 0.5], [0, 20]);
  const imageFilter = useMotionTemplate`brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-0 min-h-[100dvh] w-screen overflow-hidden transition-[filter,opacity] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[filter,opacity]${hideDesktopImage ? " md:hidden" : ""} ${
        blurred ? "duration-400" : "duration-150"
      }`}
      style={{
        filter: blurred
          ? `blur(18px)${reduced ? " brightness(1.16) contrast(1.05) saturate(1.06)" : ""}`
          : reduced
            ? "brightness(1.16) contrast(1.05) saturate(1.06)"
            : undefined,
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
        <motion.div className="absolute inset-0" style={{ filter: reduced ? undefined : imageFilter }}>
          <Image
            src={mobileSrc}
            alt=""
            fill
            priority
            unoptimized
            className="object-cover md:hidden"
            style={{ objectPosition: mobileObjectPosition }}
            sizes="100vw"
          />
          <Image
            src={desktopSrc}
            alt=""
            fill
            priority
            unoptimized
            className={hideDesktopImage ? "hidden" : "hidden object-cover object-center md:block"}
            style={{ objectPosition: desktopObjectPosition }}
            sizes="100vw"
          />
        </motion.div>
      </motion.div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 58% 52% at 72% 38%, rgba(255,255,255,0.32) 0%, rgba(255,248,240,0.1) 45%, transparent 72%)",
        }}
      />

      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_65%_at_72%_38%,transparent_0%,rgba(0,0,0,0.1)_55%,rgba(0,0,0,0.32)_100%)]"
        style={{
          opacity: vignetteOpacity,
          y: vignetteY,
        }}
      />
    </div>
  );
}
