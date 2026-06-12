"use client";

import type { SkillBlock } from "@/lib/content";
import { SECTION_TITLE_ON_HERO } from "@/lib/section-title";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const paperSpring = { type: "spring" as const, stiffness: 220, damping: 26, mass: 0.9 };


/** Dark / light: match site `cardSurface` — #1A1A1A + white/10 border; light = white + zinc-200. */
const NOTE_PANEL_DIM_DARK = "border border-white/10 bg-[#1A1A1A]";
const NOTE_PANEL_HOVER_DARK = "border border-white/[0.16] bg-[#222222]";
const NOTE_TAPE_DIM_DARK = "from-white/[0.12] via-white/[0.06] to-white/[0.12]";
const NOTE_TAPE_HOVER_DARK = "from-white/[0.16] via-white/[0.08] to-white/[0.16]";

const NOTE_PANEL_DIM_LIGHT = "border border-zinc-200 bg-white";
const NOTE_PANEL_HOVER_LIGHT = "border border-zinc-300 bg-zinc-50";
const NOTE_TAPE_DIM_LIGHT = "from-zinc-200/95 via-zinc-100/70 to-zinc-200/95";
const NOTE_TAPE_HOVER_LIGHT = "from-zinc-300/90 via-zinc-200/75 to-zinc-300/90";

const NOTE_MOTION = [
  { idleZ: -1.4, flutterMs: 6.2 },
  { idleZ: 1.1, flutterMs: 6.9 },
  { idleZ: -0.85, flutterMs: 7.4 },
] as const;

function distToRect(px: number, py: number, r: DOMRect) {
  const cx = Math.min(Math.max(px, r.left), r.right);
  const cy = Math.min(Math.max(py, r.top), r.bottom);
  return Math.hypot(px - cx, py - cy);
}

function SkillCardTitle({ block, isDark }: { block: SkillBlock; isDark: boolean }) {
  const base =
    "min-w-0 w-full text-[0.7rem] font-extrabold uppercase leading-snug tracking-[0.18em] hyphens-none [overflow-wrap:anywhere] sm:flex-1 md:text-xs md:tracking-[0.2em] " +
    (isDark ? "text-white title-glow-opposite-light-text" : "text-zinc-950 title-glow-opposite-dark-text");

  if (block.num === "01") {
    return (
      <h3 className={base}>
        <span className="text-balance">Video Editing,</span>{" "}
        <span className="whitespace-nowrap">Motion &amp; Sound</span>
      </h3>
    );
  }

  return (
    <h3 className={`${base} text-balance`}>{block.title}</h3>
  );
}

type StickyNoteProps = {
  index: number;
  reduced: boolean;
  isDark: boolean;
  children: ReactNode;
};

function StickyNote({ index, reduced, isDark, children }: StickyNoteProps) {
  const noteMotion = NOTE_MOTION[index % NOTE_MOTION.length]!;
  const [hovered, setHovered] = useState(false);

  const panelClass = isDark
    ? hovered
      ? NOTE_PANEL_HOVER_DARK
      : NOTE_PANEL_DIM_DARK
    : hovered
      ? NOTE_PANEL_HOVER_LIGHT
      : NOTE_PANEL_DIM_LIGHT;

  const tapeClass = isDark
    ? hovered
      ? NOTE_TAPE_HOVER_DARK
      : NOTE_TAPE_DIM_DARK
    : hovered
      ? NOTE_TAPE_HOVER_LIGHT
      : NOTE_TAPE_DIM_LIGHT;

  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotX = useSpring(useTransform(my, [0, 1], [5.5, -5.5]), paperSpring);
  const rotY = useSpring(useTransform(mx, [0, 1], [-6.5, 6.5]), paperSpring);

  const onMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width);
      my.set((e.clientY - r.top) / r.height);
    },
    [mx, my],
  );

  const onLeave = useCallback(() => {
    mx.set(0.5);
    my.set(0.5);
  }, [mx, my]);

  const shellClass =
    "relative z-[1] min-h-0 overflow-visible rounded-2xl px-5 pb-5 pt-5 shadow-none transition-[background-color,border-color,box-shadow] duration-300 ease-out md:px-6 md:pb-6 md:pt-6";

  const tapeBar = (
    <div className="mb-4 flex justify-center sm:mb-3" aria-hidden>
      <div
        className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${tapeClass} opacity-95 ring-1 ${isDark ? "ring-white/10" : "ring-zinc-300/55"}`}
      />
    </div>
  );

  const onNoteLeave = useCallback(() => {
    setHovered(false);
    onLeave();
  }, [onLeave]);

  if (reduced) {
    return (
      <div
        className={`${shellClass} ${panelClass} hover:z-[4]`}
        style={{ transform: `rotate(${noteMotion.idleZ}deg)` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
        }}
      >
        {tapeBar}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={`${shellClass} ${panelClass} hover:z-[4]`}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.78, ease: cinematicEase, delay: index * 0.06 }}
      whileHover={{
        scale: 1.035,
        y: -8,
        transition: { type: "spring", stiffness: 300, damping: 26, mass: 0.85 },
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onNoteLeave}
      onMouseMove={onMove}
      style={{
        rotateX: rotX,
        rotateY: rotY,
        transformPerspective: 920,
        transformStyle: "preserve-3d",
      }}
    >
      <motion.div
        className="relative h-full min-h-0"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateZ: [noteMotion.idleZ - 0.32, noteMotion.idleZ + 0.32, noteMotion.idleZ] }}
        transition={{
          duration: noteMotion.flutterMs,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {tapeBar}
        <div className="relative z-10">{children}</div>
      </motion.div>
    </motion.div>
  );
}

export type SkillsTagCloudProps = {
  isDark: boolean;
  headingClass: string;
  subheadingClass: string;
  sectionTitleClass?: string;
  title: string;
  subtitle: string;
  blocks: SkillBlock[];
};

export function SkillsTagCloud({
  isDark,
  headingClass,
  subheadingClass,
  sectionTitleClass,
  title,
  subtitle,
  blocks,
}: SkillsTagCloudProps) {
  const allTagLabels = blocks.flatMap((b) => b.tags);
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [rimByLabel, setRimByLabel] = useState<Record<string, number>>({});

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    let ticking = false;
    const paint = (clientX: number, clientY: number) => {
      const next: Record<string, number> = {};
      const falloff = 96;
      for (const label of allTagLabels) {
        const el = tagRefs.current.get(label);
        if (!el) continue;
        const d = distToRect(clientX, clientY, el.getBoundingClientRect());
        next[label] = Math.max(0, Math.min(1, 1 - d / falloff));
      }
      setRimByLabel(next);
    };

    const onMove = (e: globalThis.MouseEvent) => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          paint(e.clientX, e.clientY);
        });
      }
    };

    const onLeave = () => setRimByLabel({});

    root.addEventListener("mousemove", onMove, { passive: true });
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, [allTagLabels]);

  const bindTagRef = useCallback((label: string) => (el: HTMLDivElement | null) => {
    if (el) tagRefs.current.set(label, el);
    else tagRefs.current.delete(label);
  }, []);

  return (
    <div className="space-y-6 md:space-y-7">
      <div>
        <h2 className={sectionTitleClass ?? SECTION_TITLE_ON_HERO}>{title}</h2>
        <p
          className={`mt-3 max-w-2xl text-sm font-medium leading-relaxed tracking-tight md:text-base ${subheadingClass}`}
        >
          {subtitle}
        </p>
      </div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.88, ease: cinematicEase }}
        ref={wrapRef}
        className="relative isolate grid grid-cols-1 gap-6 pt-2 md:grid-cols-3 md:gap-7 md:px-1"
      >
        {blocks.map((block, i) => (
          <StickyNote key={block.num} index={i} reduced={Boolean(reduced)} isDark={isDark}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3 md:gap-4">
              <span
                className={`shrink-0 select-none font-mono text-[2.1rem] font-semibold leading-none tabular-nums tracking-[-0.04em] md:text-[2.5rem] md:font-bold md:tracking-[-0.05em] ${
                  isDark ? "text-white/25" : "text-zinc-900/75"
                }`}
                aria-hidden
              >
                {block.num}
              </span>
              <SkillCardTitle block={block} isDark={isDark} />
            </div>

            <ul className="mt-5 space-y-2.5 md:mt-6 md:space-y-3" role="list">
              {block.tags.map((tag) => {
                const rim = rimByLabel[tag] ?? 0;
                return (
                  <li key={tag} className="list-none">
                    <div ref={bindTagRef(tag)}>
                      <span
                        className={`group relative inline-block cursor-default px-0.5 font-mono text-[0.8125rem] font-semibold tracking-[-0.02em] transition-colors duration-200 md:text-[0.9375rem] md:font-bold md:tracking-tight ${
                          isDark ? "text-zinc-300" : "text-zinc-800"
                        }`}
                        style={{
                          textShadow:
                            rim > 0.04
                              ? `0 0 ${5 + rim * 14}px rgba(180,83,9,${0.08 + rim * 0.14})`
                              : undefined,
                        }}
                      >
                        <span
                          className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-9 w-[calc(100%+1rem)] -translate-x-1/2 -translate-y-1/2 rounded-sm opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
                          style={{
                            background:
                              "radial-gradient(ellipse at center, rgba(251,191,36,0.35) 0%, rgba(245,158,11,0.1) 50%, transparent 72%)",
                          }}
                          aria-hidden
                        />
                        <span
                          className={`pointer-events-none absolute left-0 right-0 top-1/2 z-[2] h-[1.15em] origin-center -translate-y-1/2 scale-x-0 rounded-[2px] opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:scale-x-100 group-hover:opacity-100 ${
                            isDark ? "bg-white/[0.08]" : "bg-zinc-900/[0.08]"
                          }`}
                          aria-hidden
                        />
                        <span
                          className={`relative z-[3] transition-colors duration-200 ${
                            isDark ? "group-hover:text-white" : "group-hover:text-zinc-950"
                          }`}
                        >
                          {tag}
                        </span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </StickyNote>
        ))}
      </motion.div>
    </div>
  );
}
