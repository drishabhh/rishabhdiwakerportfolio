"use client";

import { animate, motion, useMotionValue, useMotionValueEvent, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type HighlightEditItem = {
  title: string;
  views: string;
  caption?: string;
  thumbnail: string;
  thumbUnoptimized?: boolean;
  href?: string;
  badge?: string;
};

const GAP = 20;
const CARD_WIDTH = 260;
const STEP = CARD_WIDTH + GAP;
const GLOW_HALF = 140;
const FAN_DEG = 1.05;

type HighlightCardProps = {
  item: HighlightEditItem;
  physicalIndex: number;
  visualIndex: number;
  total: number;
  isDark: boolean;
  activePhysicalIndex: number;
};

const hoverTiltEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

function youtubePostCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  const w = iframe?.contentWindow;
  if (!w) return;
  w.postMessage(JSON.stringify({ event: "command", func, args }), "https://www.youtube.com");
}

function youtubeEmbedFromUrl(url?: string, opts?: { muted?: boolean; origin?: string }): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get("v");
    if (!id) return undefined;
    const q = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      controls: "1",
      autoplay: "1",
    });
    if (opts?.muted) q.set("mute", "1");
    if (opts?.origin) {
      q.set("enablejsapi", "1");
      q.set("origin", opts.origin);
    }
    const start = parsed.searchParams.get("t");
    if (start) q.set("start", start.replace(/[^\d]/g, ""));
    return `https://www.youtube.com/embed/${id}?${q.toString()}`;
  } catch {
    return undefined;
  }
}

function HighlightCard({ item, physicalIndex, visualIndex, total, isDark, activePhysicalIndex }: HighlightCardProps) {
  const sheenX = useSpring(50, { stiffness: 220, damping: 30 });
  const sheenOpacity = useSpring(0, { stiffness: 240, damping: 28 });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(false);
  /** True when user opened via the play button — keep iframe interactive and do not stop on hover leave. */
  const [embedLocked, setEmbedLocked] = useState(false);
  const [hoverAutoplayOk, setHoverAutoplayOk] = useState(true);
  const [playerMuted, setPlayerMuted] = useState(true);
  const embedOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const embedSrc = playing
    ? youtubeEmbedFromUrl(item.href, { muted: !embedLocked, origin: embedOrigin || undefined })
    : undefined;

  const syncYoutubeAudio = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (playerMuted) {
      youtubePostCommand(iframe, "mute");
    } else {
      youtubePostCommand(iframe, "unMute");
    }
  }, [playerMuted]);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHoverAutoplayOk(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!playing) return;
    setPlayerMuted(!embedLocked);
  }, [playing, embedLocked]);

  useEffect(() => {
    if (!embedSrc) return;
    const t = window.setTimeout(syncYoutubeAudio, 120);
    return () => window.clearTimeout(t);
  }, [embedSrc, syncYoutubeAudio]);

  const fan = (visualIndex - (total - 1) / 2) * FAN_DEG;
  const bgPos = useTransform(sheenX, (v) => `${v}% 50%`);

  const glassBorder = isDark
    ? "border border-white/20 bg-zinc-950/30 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-md"
    : "border border-white/55 bg-white/40 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-zinc-200/70 backdrop-blur-md";

  return (
    <div
      data-highlight-card
      className="relative shrink-0"
      style={{ width: CARD_WIDTH, zIndex: activePhysicalIndex === physicalIndex ? 3 : 1, perspective: 1100 }}
    >
      <motion.div
        className={`relative overflow-hidden rounded-2xl ${glassBorder}`}
        initial={false}
        whileHover={{
          rotateX: -8,
          rotateY: 12,
          scale: 1.03,
          translateZ: 18,
        }}
        transition={{
          duration: 0.5,
          ease: hoverTiltEase,
        }}
        style={{
          rotateZ: fan,
          transformStyle: "preserve-3d",
          transformOrigin: "center center",
        }}
        onHoverStart={() => {
          sheenOpacity.set(0.52);
          sheenX.set(68);
          if (item.href && hoverAutoplayOk) setPlaying(true);
        }}
        onHoverEnd={() => {
          sheenOpacity.set(0);
          sheenX.set(50);
          if (!embedLocked) setPlaying(false);
        }}
      >
        <div className={`relative aspect-[9/16] w-full ${item.href ? "cursor-default" : ""}`}>
          {!embedSrc ? (
            <>
              <Image
                src={item.thumbnail}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 72vw, 280px"
                unoptimized={Boolean(item.thumbUnoptimized)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
              <motion.div
                className="pointer-events-none absolute inset-0 mix-blend-overlay"
                style={{
                  opacity: sheenOpacity,
                  backgroundImage:
                    "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.38) 50%, transparent 62%)",
                  backgroundSize: "200% 100%",
                  backgroundPosition: bgPos,
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0 z-20 bg-black">
              <iframe
                ref={iframeRef}
                title={`${item.title} video`}
                className="absolute inset-0 h-full w-full border-0"
                src={embedSrc}
                style={{ pointerEvents: embedLocked ? "auto" : "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onLoad={syncYoutubeAudio}
              />
              <button
                type="button"
                className="absolute bottom-11 left-2 z-30 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/65 text-white backdrop-blur"
                aria-label={playerMuted ? "Unmute video" : "Mute video"}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayerMuted((m) => !m);
                }}
              >
                {playerMuted ? (
                  <VolumeX className="h-4 w-4" aria-hidden />
                ) : (
                  <Volume2 className="h-4 w-4" aria-hidden />
                )}
              </button>
              <button
                type="button"
                className="absolute right-2 top-2 z-30 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/65 text-white backdrop-blur"
                aria-label={`Close video: ${item.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEmbedLocked(false);
                  setPlaying(false);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
          {item.badge ? (
            <div className="absolute left-2 top-2 z-30 rounded-md border border-amber-200/80 bg-gradient-to-br from-amber-400 to-orange-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white title-glow-opposite-light-text shadow-lg md:text-[10px]">
              {item.badge}
            </div>
          ) : null}
          {!embedSrc ? <div className="absolute inset-0 flex items-center justify-center">
            {item.href ? (
              <button
                type="button"
                className="relative z-20 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-400/90 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
                aria-label={`Play video: ${item.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEmbedLocked(true);
                  setPlaying(true);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <motion.div
                  className="rounded-full border border-white/35 bg-black/50 p-3.5 text-white shadow-lg backdrop-blur-sm md:p-4"
                  whileHover={{
                    scale: 1.08,
                    boxShadow: "0 0 42px rgba(255, 190, 110, 0.5)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Play className="ml-0.5 h-5 w-5 fill-white text-white md:h-6 md:w-6" aria-hidden />
                </motion.div>
              </button>
            ) : (
              <motion.div
                className="rounded-full border border-white/35 bg-black/50 p-3.5 text-white shadow-lg backdrop-blur-sm md:p-4"
                aria-hidden
              >
                <Play className="ml-0.5 h-5 w-5 fill-white text-white md:h-6 md:w-6" aria-hidden />
              </motion.div>
            )}
          </div> : null}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 px-3 pb-3 pt-8">
            <p className="line-clamp-2 text-[10px] font-medium uppercase tracking-wide text-white title-glow-opposite-light-text md:text-[11px]">
              {item.title}
            </p>
            {item.caption ? (
              <p className="mt-0.5 text-[9px] font-normal leading-snug text-white/65 md:text-[10px]">{item.caption}</p>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

type HighlightedEditsGalleryProps = {
  items: HighlightEditItem[];
  isDark: boolean;
};

export function HighlightedEditsGallery({ items, isDark }: HighlightedEditsGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stripARef = useRef<HTMLDivElement>(null);
  const stripBRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef({ left: 0, right: 0 });
  const cycleLenRef = useRef(0);
  const hoverPausedRef = useRef(false);
  const draggingRef = useRef(false);
  const animatingRef = useRef(false);
  const x = useMotionValue(0);
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });
  const [activePhysicalIndex, setActivePhysicalIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const glowLeft = useSpring(0, { stiffness: 200, damping: 28 });
  const glowRafRef = useRef(0);
  const lastGlowUpdateMsRef = useRef(0);
  const GLOW_UPDATE_MIN_MS = 75;

  const updateCycleLen = useCallback(() => {
    const a = stripARef.current;
    const b = stripBRef.current;
    if (!a || !b) return;
    const period = b.offsetLeft - a.offsetLeft;
    if (period > 0) cycleLenRef.current = period;
  }, []);

  const measureConstraints = useCallback(() => {
    const c = containerRef.current;
    const t = trackRef.current;
    if (!c || !t) return;
    updateCycleLen();
    const max = Math.min(0, c.clientWidth - t.scrollWidth);
    const next = { left: max, right: 0 };
    constraintsRef.current = next;
    setConstraints(next);
  }, [updateCycleLen]);

  const recomputeGlow = useCallback(() => {
    const c = containerRef.current;
    const t = trackRef.current;
    if (!c || !t) return;
    const cx = c.clientWidth / 2;
    const crect = c.getBoundingClientRect();
    const cards = t.querySelectorAll<HTMLElement>("[data-highlight-card]");
    let bi = 0;
    let bestCenter = 0;
    let bestD = Number.POSITIVE_INFINITY;
    cards.forEach((el, pi) => {
      const rect = el.getBoundingClientRect();
      const center = rect.left - crect.left + rect.width / 2;
      const d = Math.abs(center - cx);
      if (d < bestD) {
        bestD = d;
        bi = pi;
        bestCenter = center;
      }
    });
    setActivePhysicalIndex(bi);
    glowLeft.set(bestCenter - GLOW_HALF);
  }, [glowLeft]);

  const scheduleGlowRecompute = useCallback(
    (force = false) => {
      if (glowRafRef.current) return;
      glowRafRef.current = window.requestAnimationFrame((ts) => {
        glowRafRef.current = 0;
        if (!force && ts - lastGlowUpdateMsRef.current < GLOW_UPDATE_MIN_MS) return;
        lastGlowUpdateMsRef.current = ts;
        recomputeGlow();
      });
    },
    [recomputeGlow],
  );

  const runAnimate = useCallback(
    (target: number) => {
      animatingRef.current = true;
      void animate(x, target, { type: "spring", stiffness: 340, damping: 34 }).then(() => {
        animatingRef.current = false;
      });
    },
    [x],
  );

  const slidePrev = useCallback(() => {
    const W = cycleLenRef.current;
    if (W <= 0) return;
    let v = x.get() + STEP;
    while (v > 0) v -= W;
    runAnimate(v);
  }, [runAnimate, x]);

  const slideNext = useCallback(() => {
    const W = cycleLenRef.current;
    if (W <= 0) return;
    let v = x.get() - STEP;
    while (v <= -W) v += W;
    runAnimate(v);
  }, [runAnimate, x]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    let rafId = 0;
    let last = performance.now();
    const PX_PER_MS = 0.242;

    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const W = cycleLenRef.current;
      if (
        W > 0 &&
        !hoverPausedRef.current &&
        !draggingRef.current &&
        !animatingRef.current
      ) {
        let v = x.get() - PX_PER_MS * dt;
        while (v <= -W) v += W;
        x.set(v);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [reducedMotion, x]);

  useLayoutEffect(() => {
    const run = () => {
      measureConstraints();
      recomputeGlow();
    };
    run();
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(run);
    });
    const ro = new ResizeObserver(run);
    if (containerRef.current) ro.observe(containerRef.current);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", run);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (glowRafRef.current) cancelAnimationFrame(glowRafRef.current);
      ro.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [items.length, measureConstraints, recomputeGlow]);

  useMotionValueEvent(x, "change", () => scheduleGlowRecompute(false));

  return (
    <motion.section
      id="highlighted-edits"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 1.12, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className="relative left-1/2 z-10 w-screen max-w-[100vw] -translate-x-1/2 scroll-mt-28 space-y-0 overflow-x-clip"
      aria-labelledby="highlighted-edits-heading"
    >
      <div className="relative z-20 mx-auto mb-5 flex max-w-6xl items-center justify-between gap-4 px-6 md:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="h-px w-10 shrink-0 bg-white md:w-12 [box-shadow:0_1px_3px_rgba(0,0,0,0.45)]"
            aria-hidden
          />
          <h3
            id="highlighted-edits-heading"
            className="truncate text-xs font-semibold uppercase tracking-[0.22em] text-white title-glow-opposite-light-text md:text-sm"
          >
            Highlighted edits
          </h3>
        </div>
        <span
          className="shrink-0 font-mono text-xs tabular-nums tracking-widest text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.5)] sm:text-sm"
          aria-hidden
        >
          (01)
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-x-clip overflow-y-visible py-6"
        onPointerEnter={() => {
          hoverPausedRef.current = true;
        }}
        onPointerLeave={() => {
          hoverPausedRef.current = false;
        }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-1/2 z-0 h-[min(400px,78vw)] w-[min(280px,70vw)] -translate-y-1/2 rounded-full opacity-45 blur-3xl md:opacity-[0.52]"
          style={{
            left: glowLeft,
            background: "radial-gradient(ellipse at center, rgba(255, 145, 65, 0.55) 0%, rgba(255, 110, 35, 0.22) 48%, transparent 70%)",
          }}
        />

        <button
          type="button"
          onClick={slidePrev}
          aria-label="Show previous highlighted edits"
          className="absolute left-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white opacity-100 shadow-lg backdrop-blur-md transition hover:bg-black/70 sm:left-4 md:left-6 md:h-11 md:w-11"
        >
          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          onClick={slideNext}
          aria-label="Show next highlighted edits"
          className="absolute right-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white opacity-100 shadow-lg backdrop-blur-md transition hover:bg-black/70 sm:right-4 md:right-6 md:h-11 md:w-11"
        >
          <ChevronRight className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2} aria-hidden />
        </button>

        <motion.div
          ref={trackRef}
          className="relative z-10 flex cursor-grab touch-pan-y select-none gap-5 pl-14 pr-14 active:cursor-grabbing sm:pl-16 sm:pr-16 md:pl-[4.5rem] md:pr-[4.5rem]"
          style={{ x }}
          drag="x"
          dragConstraints={constraints}
          dragElastic={0.12}
          dragMomentum
          dragTransition={{ bounceStiffness: 340, bounceDamping: 24, power: 0.32, min: 0, max: 0 }}
          onDragStart={() => {
            draggingRef.current = true;
          }}
          onDragEnd={() => {
            draggingRef.current = false;
            const W = cycleLenRef.current;
            if (W > 0) {
              let v = x.get();
              while (v <= -W) v += W;
              while (v > 0) v -= W;
              x.set(v);
            }
            measureConstraints();
            requestAnimationFrame(measureConstraints);
          }}
        >
          <div ref={stripARef} className="flex shrink-0 gap-5">
            {items.map((item, index) => (
              <HighlightCard
                key={`a-${item.title}-${index}`}
                item={item}
                physicalIndex={index}
                visualIndex={index}
                total={items.length}
                isDark={isDark}
                activePhysicalIndex={activePhysicalIndex}
              />
            ))}
          </div>
          <div ref={stripBRef} className="flex shrink-0 gap-5">
            {items.map((item, index) => (
              <HighlightCard
                key={`b-${item.title}-${index}`}
                item={item}
                physicalIndex={index + items.length}
                visualIndex={index}
                total={items.length}
                isDark={isDark}
                activePhysicalIndex={activePhysicalIndex}
              />
            ))}
          </div>
          <div className="shrink-0" style={{ width: "min(4.5rem, 12vw)" }} aria-hidden />
        </motion.div>
      </div>
    </motion.section>
  );
}
