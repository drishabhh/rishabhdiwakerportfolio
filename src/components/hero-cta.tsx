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
      className="group pointer-events-auto mt-2 inline-flex w-fit items-center gap-1 rounded-full border border-white/45 bg-zinc-950/55 px-2 py-1.5 text-[10px] font-semibold tracking-tight text-white shadow-[0_6px_18px_rgba(0,0,0,0.68),0_14px_34px_rgba(0,0,0,0.55),0_24px_52px_rgba(0,0,0,0.4),0_36px_72px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-[transform,box-shadow,background-color,border-color] duration-200 hover:-translate-y-1 hover:border-orange-400/55 hover:bg-zinc-900/65 hover:shadow-[0_10px_26px_rgba(0,0,0,0.62),0_20px_48px_rgba(0,0,0,0.48),0_32px_68px_rgba(255,77,0,0.22)] max-md:shadow-[0_6px_18px_rgba(0,0,0,0.68),0_14px_34px_rgba(0,0,0,0.55),0_24px_52px_rgba(0,0,0,0.4),0_36px_72px_rgba(0,0,0,0.24)] max-md:hover:shadow-[0_10px_26px_rgba(0,0,0,0.62),0_20px_48px_rgba(0,0,0,0.48),0_32px_68px_rgba(255,77,0,0.22)] tall:mt-6 tall:gap-3 tall:border-white/30 tall:bg-white/10 tall:px-6 tall:py-3 tall:text-[0.9375rem] tall:tracking-wide tall:hover:bg-orange-500/20 md:mt-6 md:gap-3 md:border-white/30 md:bg-white/10 md:px-6 md:py-3 md:text-[0.9375rem] md:tracking-wide md:shadow-[0_10px_36px_rgba(0,0,0,0.28)] md:hover:bg-orange-500/20 md:hover:shadow-[0_14px_44px_rgba(255,77,0,0.38)]"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/30 ring-1 ring-white/35 transition-[background-color,transform] duration-200 group-hover:scale-105 group-hover:bg-orange-500 group-hover:ring-orange-300/40 tall:h-8 tall:w-8 tall:bg-white/15 tall:ring-white/25 md:h-8 md:w-8 md:bg-white/15 md:ring-white/25">
        <Play className="h-2 w-2 fill-current pl-0.5 tall:h-3.5 tall:w-3.5 md:h-3.5 md:w-3.5" aria-hidden />
      </span>
      <span className="title-glow-opposite-light-text">{label}</span>
    </motion.a>
  );
}
