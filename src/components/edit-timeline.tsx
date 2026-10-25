"use client";

import { useNativePageScrollProgress } from "@/hooks/use-native-scroll-progress";
import { scrollVelocity } from "@/lib/scroll-velocity";
import { motion, useMotionValue, useMotionValueEvent, useSpring, useTransform } from "framer-motion";
import { useLenis } from "lenis/react";
import type { LucideIcon } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

export type TimelineClip<Id extends string = string> = {
  id: Id;
  label: string;
  targetId: string;
  icon?: LucideIcon;
};

/**
 * start/end: the scroll range (0–1) in which this section is the active one.
 * left/right: where its clip is drawn on the strip (0–1).
 */
type ClipSpan<Id extends string> = TimelineClip<Id> & { start: number; end: number; left: number; right: number };

const FPS = 24;
/** The whole page plays as a 90-second edit. */
const RUNTIME_SECONDS = 90;
/** Short tail sections (the footer can't scroll to the top) still get a readable clip. */
const MIN_CLIP_SPAN = 0.045;
/** Phones get equal-width clips so every section is tappable. */
const COMPACT_QUERY = "(max-width: 639px)";
/* Integer math only (no Math.sin) so every JS engine draws the identical waveform at hydration:
   hashed noise, smoothed across neighbours, shaped by two rolling "loudness" envelopes. */
const WAVE_BARS = 220;
const waveNoise = (i: number) => ((Math.imul(i + 1, 2654435761) >>> 0) % 997) / 997;
const triangle = (i: number, period: number) => 1 - Math.abs(((2 * i) % (2 * period)) - period) / period;
const WAVE_HEIGHTS = Array.from({ length: WAVE_BARS }, (_, i) => {
  const smoothed = (waveNoise(i - 1) + 2 * waveNoise(i) + waveNoise(i + 1)) / 4;
  const envelope = 0.35 + 0.65 * triangle(i, 37) * (0.5 + 0.5 * triangle(i + 9, 13));
  return Math.round((0.12 + 0.88 * smoothed * envelope) * 100) / 100;
});
/* Ruler: a tick every 5 seconds, labelled every 15. */
const RULER_SECONDS = Array.from({ length: RUNTIME_SECONDS / 5 + 1 }, (_, i) => i * 5);

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const pad = (n: number) => String(n).padStart(2, "0");

function timecode(progress: number): string {
  const totalFrames = Math.round(clamp01(progress) * RUNTIME_SECONDS * FPS);
  const seconds = Math.floor(totalFrames / FPS);
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}:${pad(totalFrames % FPS)}`;
}

/**
 * Scroll position at which each section becomes the active one. Mirrors updateActiveSection in
 * app/home-client.tsx (anchor line at 30% / 34% of the viewport, Summary's early switch and the
 * footer's extra allowance), so the playhead crosses a clip edge exactly when the highlight changes.
 */
function sectionActivationY(targetId: string, el: HTMLElement, vh: number, mobile: boolean): number {
  const top = el.getBoundingClientRect().top + window.scrollY;
  const anchor = vh * (mobile ? 0.34 : 0.3);
  if (targetId === "summary-bio") return Math.min(vh * (mobile ? 0.16 : 0.22), top - vh * (mobile ? 0.38 : 0.68));
  if (targetId === "colophon") {
    const pageBottom = document.documentElement.scrollHeight - vh - 4;
    return Math.min(top - anchor - (mobile ? 20 : 40), pageBottom);
  }
  return top - anchor;
}

/** Each section's active scroll range plus where its clip is drawn (proportional, or equal on phones). */
function measureClips<Id extends string>(clips: readonly TimelineClip<Id>[], compact: boolean): ClipSpan<Id>[] {
  const vh = window.innerHeight;
  const mobile = window.innerWidth < 768;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  const placed = clips.flatMap((clip, i) => {
    if (i === 0) return [{ ...clip, start: 0 }];
    const el = document.getElementById(clip.targetId);
    if (!el) return [];
    return [{ ...clip, start: clamp01(sectionActivationY(clip.targetId, el, vh, mobile) / maxScroll) }];
  });
  for (let i = 1; i < placed.length; i++) placed[i].start = Math.max(placed[i].start, placed[i - 1].start);

  const lefts = placed.map((clip, i) => (compact ? i / placed.length : clip.start));
  if (!compact) {
    for (let i = lefts.length - 1, next = 1; i > 0; i--) {
      lefts[i] = Math.min(lefts[i], next - MIN_CLIP_SPAN);
      next = lefts[i];
    }
  }
  return placed.map((clip, i) => ({
    ...clip,
    end: placed[i + 1]?.start ?? 1,
    left: lefts[i],
    right: lefts[i + 1] ?? 1,
  }));
}

/* Scroll progress → playhead position: inside the active section's clip, in step with how far
   through that section the page is. */
function toStrip(p: number, spans: ClipSpan<string>[]): number {
  if (spans.length === 0) return clamp01(p);
  let index = 0;
  for (let i = 0; i < spans.length; i++) if (p >= spans[i].start) index = i;
  const span = spans[index];
  const within = span.end > span.start ? clamp01((p - span.start) / (span.end - span.start)) : 1;
  return span.left + within * (span.right - span.left);
}

/* Playhead position → scroll progress (the inverse, for scrubbing). */
function fromStrip(x: number, spans: ClipSpan<string>[]): number {
  if (spans.length === 0) return clamp01(x);
  const target = clamp01(x);
  let index = 0;
  for (let i = 0; i < spans.length; i++) if (target >= spans[i].left) index = i;
  const span = spans[index];
  const within = span.right > span.left ? clamp01((target - span.left) / (span.right - span.left)) : 0;
  return span.start + within * (span.end - span.start);
}

type EditTimelineProps<Id extends string> = {
  clips: readonly TimelineClip<Id>[];
  activeId: Id;
  onSelect: (id: Id) => void;
};

/**
 * The site's navigation, styled as an NLE timeline: timecode and current section on the left,
 * a ruler, one clip per section (V1), and an audio track (A1) that lights up as it plays and
 * swells with scroll speed. Drag or click the ruler/waveform to scrub through the page.
 * The playhead, timecode and waveform follow the scroll without React re-renders.
 */
function EditTimelineBase<Id extends string>({ clips, activeId, onSelect }: EditTimelineProps<Id>) {
  const lenis = useLenis();
  const progress = useNativePageScrollProgress(true);
  const timecodeRef = useRef<HTMLSpanElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<ClipSpan<string>[]>([]);
  const layoutVersion = useMotionValue(0);
  const [spans, setSpans] = useState<ClipSpan<Id>[]>([]);
  const [scrubbing, setScrubbing] = useState(false);

  const stripPosition = useTransform([progress, layoutVersion], ([p]: number[]) => toStrip(p, layoutRef.current));
  const playheadX = useTransform(stripPosition, (x) => `${x * 100}%`);
  const playedClip = useTransform(stripPosition, (x) => `inset(0 ${(1 - x) * 100}% 0 0)`);
  const waveScale = useSpring(
    useTransform(scrollVelocity, (v) => 0.8 + Math.min(1, Math.abs(v) / 35) * 0.5),
    { stiffness: 260, damping: 26 },
  );

  useMotionValueEvent(progress, "change", (p) => {
    if (timecodeRef.current) timecodeRef.current.textContent = timecode(p);
  });

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    let frame = 0;
    const remeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = measureClips(clips, mq.matches);
        layoutRef.current = next;
        setSpans(next);
        layoutVersion.set(layoutVersion.get() + 1);
      });
    };
    remeasure();
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);
    mq.addEventListener("change", remeasure);
    window.addEventListener("resize", remeasure);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      mq.removeEventListener("change", remeasure);
      window.removeEventListener("resize", remeasure);
    };
  }, [clips, layoutVersion]);

  const seek = (clientX: number) => {
    const strip = stripRef.current;
    if (!strip) return;
    const rect = strip.getBoundingClientRect();
    const p = fromStrip((clientX - rect.left) / rect.width, layoutRef.current);
    const top = p * Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (lenis) lenis.scrollTo(top, { lerp: 0.16 });
    else window.scrollTo({ top });
  };

  const activeClip = clips.find((clip) => clip.id === activeId);
  const ActiveIcon = activeClip?.icon;

  return (
    <nav
      aria-label="Page timeline"
      className="fixed inset-x-0 bottom-0 z-[70]"
    >
      <div className="relative flex w-full select-none overflow-hidden border-t border-white/[0.12] bg-[#0b0b0d]/95 pb-[env(safe-area-inset-bottom)] font-mono text-white/70 shadow-[0_-18px_50px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]">
        {/* Hairline sheen along the top edge */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />

        {/* Timecode + current section */}
        <div className="flex w-[94px] shrink-0 flex-col justify-center gap-1 border-r border-white/10 bg-white/[0.02] px-3 md:w-[156px] md:gap-1.5 md:px-4">
          <span
            ref={timecodeRef}
            className="text-[11px] font-semibold tabular-nums tracking-wider text-white [text-shadow:0_0_14px_rgba(255,255,255,0.35)] md:text-[18px]"
          >
            00:00:00:00
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-[9px] uppercase tracking-[0.08em] text-white/65 md:text-[10px] md:tracking-[0.2em]">
            {ActiveIcon ? <ActiveIcon className="h-3 w-3 shrink-0 text-white" aria-hidden /> : null}
            <span className="truncate">{activeClip?.label}</span>
          </span>
        </div>

        {/* Track names */}
        <div
          aria-hidden
          className="hidden w-8 shrink-0 flex-col gap-1 border-r border-white/10 py-2.5 text-[9px] font-semibold tracking-wider text-white/35 md:flex"
        >
          <span className="h-4" />
          <span className="flex h-[34px] items-center justify-center">V1</span>
          <span className="flex h-5 items-center justify-center">A1</span>
        </div>

        {/* Ruler, clips, waveform, playhead — drag empty space to scrub */}
        <div
          className={`relative min-w-0 flex-1 touch-none px-2 py-2 md:px-3 md:py-2.5 ${scrubbing ? "cursor-grabbing" : "cursor-ew-resize"}`}
          onPointerDown={(event) => {
            if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setScrubbing(true);
            seek(event.clientX);
          }}
          onPointerMove={(event) => {
            if (scrubbing) seek(event.clientX);
          }}
          onPointerUp={() => setScrubbing(false)}
          onPointerCancel={() => setScrubbing(false)}
        >
          <div ref={stripRef} className="relative flex flex-col gap-1">
            {/* Ruler */}
            <div aria-hidden className="relative hidden h-4 md:block">
              {RULER_SECONDS.map((seconds) => {
                const major = seconds % 15 === 0;
                const x = seconds / RUNTIME_SECONDS;
                return (
                  <div key={seconds} className="absolute bottom-0" style={{ left: `${x * 100}%` }}>
                    <div className={`w-px ${major ? "h-2 bg-white/40" : "h-1 bg-white/20"}`} />
                    {major && seconds < RUNTIME_SECONDS ? (
                      <span className="absolute bottom-2 left-1 text-[8px] leading-none text-white/40">
                        {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* V1: one clip per section */}
            <div className="relative h-[28px] md:h-[34px]">
              {spans.map((span) => {
                const active = span.id === activeId;
                const Icon = span.icon;
                const left = span.left;
                const width = span.right - span.left;
                return (
                  <button
                    key={span.id}
                    type="button"
                    aria-label={span.label}
                    aria-current={active ? "location" : undefined}
                    onClick={() => onSelect(span.id)}
                    className={`@container absolute inset-y-0 overflow-hidden rounded-md border transition-[background-color,border-color,box-shadow,color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                      active
                        ? "border-white bg-gradient-to-b from-white to-zinc-300 text-zinc-950 shadow-[0_0_22px_-4px_rgba(255,255,255,0.5)]"
                        : "border-white/10 bg-gradient-to-b from-white/[0.10] to-white/[0.03] text-white/55 hover:border-white/25 hover:from-white/[0.17] hover:text-white/90"
                    }`}
                    style={{ left: `${left * 100}%`, width: `calc(${width * 100}% - 3px)` }}
                  >
                    {/* Trim handle */}
                    <span
                      aria-hidden
                      className={`absolute inset-y-1 left-0.5 w-[2px] rounded-full ${active ? "bg-zinc-950/40" : "bg-white/20"}`}
                    />
                    <span className="flex h-full items-center justify-center gap-1.5 px-2 @min-[84px]:justify-start">
                      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" strokeWidth={active ? 2.4 : 2} aria-hidden /> : null}
                      <span className="hidden truncate text-[10px] uppercase leading-none tracking-[0.12em] @min-[84px]:block md:text-[11px]">
                        {span.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* A1: waveform — the played part lights up; it swells with scroll speed */}
            <motion.div aria-hidden className="relative h-3.5 origin-center md:h-5" style={{ scaleY: waveScale }}>
              <svg
                data-waveform
                viewBox={`0 0 ${WAVE_BARS} 10`}
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full text-white/25"
              >
                {WAVE_HEIGHTS.map((h, i) => (
                  <rect key={i} x={i + 0.15} y={5 - h * 5} width={0.7} height={h * 10} rx={0.3} fill="currentColor" />
                ))}
              </svg>
              <motion.svg
                viewBox={`0 0 ${WAVE_BARS} 10`}
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full text-white [filter:drop-shadow(0_0_3px_rgba(255,255,255,0.5))]"
                style={{ clipPath: playedClip }}
              >
                {WAVE_HEIGHTS.map((h, i) => (
                  <rect key={i} x={i + 0.15} y={5 - h * 5} width={0.7} height={h * 10} rx={0.3} fill="currentColor" />
                ))}
              </motion.svg>
            </motion.div>

            {/* Playhead */}
            <motion.div data-playhead aria-hidden className="pointer-events-none absolute inset-0" style={{ x: playheadX }}>
              <div className="absolute -top-1 bottom-0 w-6 -translate-x-1/2 bg-orange-400/15 blur-md" />
              <div className="absolute -top-0.5 bottom-0 w-[2px] -translate-x-1/2 bg-gradient-to-b from-orange-300 to-orange-500 shadow-[0_0_12px_rgba(251,146,60,0.9)]" />
              <div className="absolute -top-1 h-3 w-3.5 -translate-x-1/2 rounded-[2px] bg-orange-400 [clip-path:polygon(0_0,100%_0,100%_55%,50%_100%,0_55%)]" />
            </motion.div>
          </div>
        </div>

        {/* Record status */}
        <div className="hidden w-[92px] shrink-0 flex-col items-center justify-center gap-1.5 border-l border-white/10 text-[10px] tracking-[0.2em] md:flex">
          <span className="flex items-center gap-1.5 font-semibold text-red-400 [text-shadow:0_0_10px_rgba(239,68,68,0.75)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.85)]" />
            REC
          </span>
          <span className="text-white/45">{FPS} FPS</span>
        </div>
      </div>
    </nav>
  );
}

/* memo() drops generics from the signature, so restore them for typed onSelect ids. */
export const EditTimeline = memo(EditTimelineBase) as typeof EditTimelineBase;
