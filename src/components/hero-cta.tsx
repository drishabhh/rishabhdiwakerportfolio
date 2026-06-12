"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Play } from "lucide-react";

const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type HeroCtaProps = {
  label: string;
  href: string;
  visible: boolean;
};

export function HeroCta({ label, href, visible }: HeroCtaProps) {
  const reduced = Boolean(useReducedMotion());

  if (!href.trim()) return null;

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      initial={false}
      animate={
        reduced
          ? { opacity: visible ? 1 : 0 }
          : visible
            ? { opacity: 1, filter: "blur(0px)" }
            : { opacity: 0, filter: "blur(6px)" }
      }
      transition={
        reduced
          ? { duration: 0.25 }
          : { duration: 0.55, delay: visible ? 0.72 : 0, ease: cinematicEase }
      }
      className="group pointer-events-auto mt-5 inline-flex items-center gap-2.5 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold tracking-wide text-white shadow-[0_10px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-[transform,box-shadow,background-color,border-color] duration-200 hover:-translate-y-1 hover:border-orange-400/55 hover:bg-orange-500/20 hover:shadow-[0_14px_44px_rgba(255,77,0,0.38)] md:mt-6 md:gap-3 md:px-6 md:py-3 md:text-[0.9375rem]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 transition-[background-color,transform] duration-200 group-hover:scale-105 group-hover:bg-orange-500 group-hover:ring-orange-300/40">
        <Play className="h-3.5 w-3.5 fill-current pl-0.5" aria-hidden />
      </span>
      <span className="title-glow-opposite-light-text">{label}</span>
    </motion.a>
  );
}
