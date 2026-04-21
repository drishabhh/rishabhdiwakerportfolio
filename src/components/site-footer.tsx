"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import Image from "next/image";
import { useCallback, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";

const FOOTER_BG = "#0A0A0A";
const ORANGE_GLOW = "rgba(255, 77, 0, 0.05)";

const magneticSpring = { stiffness: 220, damping: 18 };

type MagneticAnchorProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  reduced: boolean;
  strength?: number;
};

function MagneticAnchor({ href, children, className, reduced, strength = 12 }: MagneticAnchorProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, magneticSpring);
  const sy = useSpring(y, magneticSpring);
  const s = reduced ? 0 : strength;

  const onMove = useCallback(
    (e: ReactMouseEvent<HTMLAnchorElement>) => {
      if (reduced) return;
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      x.set(((e.clientX - cx) / Math.max(r.width, 1)) * s * 2);
      y.set(((e.clientY - cy) / Math.max(r.height, 1)) * s * 2);
    },
    [reduced, s, x, y],
  );

  const reset = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <a
      ref={ref}
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel={href.startsWith("mailto:") ? undefined : "noreferrer"}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={className}
    >
      <motion.span className="inline-block will-change-transform" style={{ x: sx, y: sy }}>
        {children}
      </motion.span>
    </a>
  );
}

export type SiteFooterProps = {
  email?: string;
};

export function SiteFooter({ email = "rishabhdiwaker0012@gmail.com" }: SiteFooterProps) {
  const reduced = Boolean(useReducedMotion());
  const rootRef = useRef<HTMLElement>(null);
  const [footHot, setFootHot] = useState(false);

  const paint = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--ffx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--ffy", `${((e.clientY - r.top) / r.height) * 100}%`);
  }, []);

  const clearPointer = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.removeProperty("--ffx");
    el.style.removeProperty("--ffy");
    setFootHot(false);
  }, []);

  const onEnter = useCallback(() => {
    setFootHot(true);
  }, []);

  const baseStyle = {
    ["--ffx" as string]: "50%",
    ["--ffy" as string]: "42%",
  } as CSSProperties;

  return (
    <footer
      ref={rootRef}
      id="colophon"
      aria-labelledby="contact-credits-heading"
      onMouseEnter={onEnter}
      onMouseMove={paint}
      onMouseLeave={clearPointer}
      style={{ backgroundColor: FOOTER_BG, ...baseStyle }}
      className="relative isolate overflow-hidden border-t border-white/[0.05] bg-[#0A0A0A] pb-28 pt-14 text-white md:pb-32 md:pt-16"
    >
      {/* Flashlight — brighter neutral so white copy reads as the beam passes */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        animate={{ opacity: footHot ? 0.38 : 1 }}
        transition={{ duration: reduced ? 0.2 : 1.05, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background:
            "radial-gradient(48% 44% at var(--ffx, 50%) var(--ffy, 42%), rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.035) 40%, transparent 64%)",
        }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        initial={false}
        animate={{
          opacity: footHot ? (reduced ? 0.7 : 1) : 0,
        }}
        transition={{ duration: reduced ? 0.25 : 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: `radial-gradient(125% 95% at var(--ffx, 50%) var(--ffy, 45%), ${ORANGE_GLOW} 0%, rgba(255,77,0,0.02) 42%, transparent 68%)`,
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[min(42vh,480px)] select-none overflow-hidden"
      >
        <div className="absolute left-1/2 top-0 h-[200%] w-[min(160vw,1680px)] -translate-x-1/2 opacity-[0.03]">
          <Image
            src="/hero/import-magic-export-bw.png"
            alt=""
            fill
            unoptimized
            className="object-contain object-top [transform:translateY(8%)_scale(1.5)]"
            sizes="(max-width: 768px) 160vw, 1680px"
            priority={false}
          />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-10">
        <h2
          id="contact-credits-heading"
          className="mb-10 text-xs font-bold uppercase tracking-[0.26em] text-white title-glow-opposite-light-text md:mb-12 md:text-sm"
        >
          Contact &amp; Credits
        </h2>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10 md:gap-y-0">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <p className="text-lg font-bold tracking-[-0.02em] text-white title-glow-opposite-light-text md:text-xl">
                RISHABH DIWAKER
              </p>
              <span className="inline-flex items-center gap-1.5 text-emerald-400" title="Available for projects">
                <span className="relative flex h-2 w-2 shrink-0">
                  {!reduced ? (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/35" />
                  ) : null}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400/95">
                  Available for projects
                </span>
              </span>
            </div>
            <p className="max-w-sm text-sm font-medium leading-relaxed tracking-tight text-white md:text-[0.9375rem]">
              Video Editor &amp; AI-Augmented Post-Production Specialist.
            </p>
          </div>

          <div className="flex flex-col items-start gap-5 md:px-2">
            <MagneticAnchor
              href={`mailto:${email}`}
              reduced={reduced}
              strength={18}
              className="group/cta text-2xl font-extrabold uppercase tracking-[0.12em] text-white title-glow-opposite-light-text transition-colors hover:text-white md:text-3xl md:tracking-[0.14em]"
            >
              <span className="border-b border-transparent pb-0.5 transition-[border-color] duration-300 group-hover/cta:border-white/40">
                GET IN TOUCH
              </span>
            </MagneticAnchor>
            <MagneticAnchor
              href={`mailto:${email}`}
              reduced={reduced}
              className="text-sm font-medium tracking-tight text-zinc-500 underline decoration-transparent decoration-1 underline-offset-[5px] transition-colors duration-300 hover:text-white hover:decoration-white/50"
            >
              {email}
            </MagneticAnchor>
          </div>

          <nav
            className="flex flex-col items-start gap-3 text-sm font-semibold tracking-tight md:items-end md:text-right"
            aria-label="Social profiles"
          >
            <MagneticAnchor
              href="https://youtube.com/@rishabhsportfolio?si=NTQ5HeB8CZYCBMrD"
              reduced={reduced}
              className="text-zinc-500 transition-colors duration-300 hover:text-white"
            >
              YouTube
            </MagneticAnchor>
            <MagneticAnchor
              href="https://www.linkedin.com/in/rishabhdiwaker0012"
              reduced={reduced}
              className="text-zinc-500 transition-colors duration-300 hover:text-white"
            >
              LinkedIn
            </MagneticAnchor>
          </nav>
        </div>
      </div>
    </footer>
  );
}
