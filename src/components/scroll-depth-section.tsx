"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

type ScrollDepthSectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "section" | "div";
  depth?: "shallow" | "medium" | "deep";
};

const DEPTH = {
  shallow: { rotate: 5, z: 48, y: 28 },
  medium: { rotate: 7, z: 72, y: 40 },
  deep: { rotate: 9, z: 96, y: 52 },
} as const;

export function ScrollDepthSection({
  children,
  className,
  id,
  as = "section",
  depth = "medium",
}: ScrollDepthSectionProps) {
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

  const disableDepth = reduced || isMobile;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.92", "start 0.38", "center center", "end 0.15"],
  });

  const cfg = DEPTH[depth];
  const rotateX = useTransform(
    scrollYProgress,
    [0, 0.32, 0.58, 1],
    [cfg.rotate, 0, 0, -cfg.rotate * 0.55],
  );
  const z = useTransform(scrollYProgress, [0, 0.32, 0.58, 1], [-cfg.z, 0, 0, -cfg.z * 0.45]);
  const y = useTransform(scrollYProgress, [0, 0.32, 0.58, 1], [cfg.y, 0, 0, -cfg.y * 0.35]);
  const opacity = useTransform(scrollYProgress, [0, 0.18, 0.38, 0.88, 1], [0.35, 0.82, 1, 1, 0.78]);
  const scale = useTransform(scrollYProgress, [0, 0.32, 0.58, 1], [0.93, 1, 1, 0.98]);

  const Component = as === "div" ? motion.div : motion.section;

  if (disableDepth) {
    const Static = as === "div" ? "div" : "section";
    return (
      <Static id={id} ref={ref as never} className={className}>
        {children}
      </Static>
    );
  }

  return (
    <Component
      id={id}
      ref={ref as never}
      className={className}
      style={{
        rotateX,
        y,
        z,
        opacity,
        scale,
        transformPerspective: 1400,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </Component>
  );
}
