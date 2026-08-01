"use client";

import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

type ScrollParallaxHeroBgProps = {
  desktopSrc: string;
  mobileSrc: string;
  mobileObjectPosition: string;
  blurred: boolean;
  /** Fade out fixed hero once footer enters view (mobile contact seam). */
  hidden?: boolean;
};

export function ScrollParallaxHeroBg({
  desktopSrc,
  mobileSrc,
  mobileObjectPosition,
  blurred,
  hidden = false,
}: ScrollParallaxHeroBgProps) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const scale = useTransform(scrollYProgress, [0, 0.45, 1], reduced ? [1, 1, 1] : [1, 1.08, 1.12]);
  const y = useTransform(scrollYProgress, [0, 0.45, 1], reduced ? [0, 0, 0] : [0, -32, -48]);
  const brightness = useTransform(scrollYProgress, [0, 0.35, 0.7], [1, 0.96, 0.9]);
  const vignetteOpacity = useTransform(scrollYProgress, [0, 0.2, 0.55], [0, 0.25, 0.7]);
  const vignetteY = useTransform(scrollYProgress, [0, 0.5], [0, 24]);
  const imageFilter = useMotionTemplate`brightness(${brightness})`;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 min-h-[100dvh] w-screen overflow-hidden transition-[filter,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[filter,opacity]"
      style={{
        filter: blurred ? "blur(18px)" : "blur(0px)",
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
            className="hidden object-cover object-center md:block"
            sizes="100vw"
          />
        </motion.div>
      </motion.div>

      {/* Depth vignette — shifts with scroll for parallax layering */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_65%_at_72%_38%,transparent_0%,rgba(0,0,0,0.22)_55%,rgba(0,0,0,0.55)_100%)]"
        style={{
          opacity: vignetteOpacity,
          y: vignetteY,
        }}
      />
    </div>
  );
}
