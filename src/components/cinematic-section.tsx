"use client";

import { useNativeSectionScrollProgress } from "@/hooks/use-native-scroll-progress";
import { motion, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

type CinematicSectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "section" | "div";
  /** 3D scroll depth on desktop; omit for flat cinematic reveal only */
  depth?: "shallow" | "medium" | "deep";
  /** Subtle film-line divider above the section */
  divider?: boolean;
  /** Scroll-linked fade/lift reveal (skip on heavy sections for perf) */
  reveal?: boolean;
};

const DEPTH = {
  shallow: { rotate: 4, z: 36, y: 20 },
  medium: { rotate: 5.5, z: 52, y: 28 },
  deep: { rotate: 7, z: 68, y: 36 },
} as const;

function SectionDivider() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-10 z-10 flex flex-col items-center gap-2 md:-top-14"
    >
      <div className="h-px w-[min(88%,42rem)] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="h-px w-[min(62%,24rem)] bg-gradient-to-r from-transparent via-orange-400/35 to-transparent" />
    </div>
  );
}

export function CinematicSection({
  children,
  className,
  id,
  as = "section",
  depth,
  divider = false,
  reveal = true,
}: CinematicSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const motionEnabled = !reduced;
  const scrollYProgress = useNativeSectionScrollProgress(ref, motionEnabled && !isMobile);
  const useReveal = reveal && motionEnabled && !isMobile;

  const revealOpacity = useTransform(
    scrollYProgress,
    [0, 0.14, 0.3, 0.78, 1],
    useReveal ? [0.22, 0.72, 1, 1, 0.92] : [1, 1, 1, 1, 1],
  );
  const revealY = useTransform(
    scrollYProgress,
    [0, 0.22, 0.38],
    useReveal ? [36, 10, 0] : [0, 0, 0],
  );
  const revealScale = useTransform(
    scrollYProgress,
    [0, 0.28, 0.42],
    useReveal ? [0.975, 0.995, 1] : [1, 1, 1],
  );

  const depthCfg = depth ? DEPTH[depth] : null;
  const useDepth = Boolean(depthCfg && motionEnabled && !isMobile);

  const rotateX = useTransform(
    scrollYProgress,
    [0, 0.45, 0.55, 1],
    useDepth ? [depthCfg!.rotate, 0, 0, -depthCfg!.rotate * 0.45] : [0, 0, 0, 0],
  );
  const depthZ = useTransform(
    scrollYProgress,
    [0, 0.45, 0.55, 1],
    useDepth ? [-depthCfg!.z * 0.7, 0, 0, -depthCfg!.z * 0.35] : [0, 0, 0, 0],
  );
  const depthY = useTransform(
    scrollYProgress,
    [0, 0.45, 0.55, 1],
    useDepth ? [depthCfg!.y * 0.75, 0, 0, -depthCfg!.y * 0.3] : [0, 0, 0, 0],
  );
  const depthScale = useTransform(
    scrollYProgress,
    [0, 0.45, 0.55, 1],
    useDepth ? [0.98, 1, 1, 0.99] : [1, 1, 1, 1],
  );

  const Component = as === "div" ? motion.div : motion.section;

  if (!motionEnabled || isMobile) {
    const Static = as === "div" ? "div" : "section";
    return (
      <Static id={id} ref={ref as never} className={`relative ${className ?? ""}`}>
        {divider ? <SectionDivider /> : null}
        {children}
      </Static>
    );
  }

  const content = useDepth ? (
    <motion.div
      className={className}
      style={{
        rotateX,
        y: depthY,
        z: depthZ,
        scale: depthScale,
        transformPerspective: 1400,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </motion.div>
  ) : (
    children
  );

  return (
    <Component
      id={id}
      ref={ref as never}
      className={useDepth ? "relative [content-visibility:auto]" : `relative [content-visibility:auto] ${className ?? ""}`}
      style={
        useReveal
          ? {
              opacity: revealOpacity,
              y: revealY,
              scale: revealScale,
              willChange: "transform, opacity",
            }
          : undefined
      }
    >
      {divider ? <SectionDivider /> : null}
      {content}
    </Component>
  );
}
