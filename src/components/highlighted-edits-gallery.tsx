"use client";

import { animate, motion, useMotionValue, useMotionValueEvent, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SECTION_TITLE_ON_HERO } from "@/lib/section-title";

export type HighlightEditItem = {
  title: string;
  views: string;
  caption?: string;
  thumbnail: string;
  thumbUnoptimized?: boolean;
  href?: string;
  badge?: string;
};

const GAP = 16;
const CARD_WIDTH = 228;
const STEP = CARD_WIDTH + GAP;
const GLOW_HALF = 120;
const FAN_DEG = 1.05;
const AUTO_SCROLL_DESKTOP = 0.242;

/** Keep translateX in (-cycleLen, 0] so duplicate strips loop seamlessly. */
function normalizeTrackX(value: number, cycleLen: number): number {
  if (cycleLen <= 0) return value;
  let v = value;
  while (v <= -cycleLen) v += cycleLen;
  while (v > 0) v -= cycleLen;
  return v;
}

type HighlightCardProps = {
  item: HighlightEditItem;
  physicalIndex: number;
  visualIndex: number;
  total: number;
  isDark: boolean;
  activePhysicalIndex: number;
  onPlaybackPauseChange?: (cardId: number, pause: boolean) => void;
  onEmbedLockChange?: (cardId: number, locked: boolean) => void;
  onCardInteract?: (active: boolean) => void;
};

const hoverTiltEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

function youtubePostCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  const w = iframe?.contentWindow;
  if (!w) return;
  w.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}

function youtubeEmbedFromUrl(
  url?: string,
  opts?: { muted?: boolean; origin?: string },
): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get("v");
    if (!id) return undefined;
    const q = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      controls: "0",
      autoplay: "1",
      enablejsapi: "1",
      cc_load_policy: "0",
      iv_load_policy: "3",
      disablekb: "1",
    });
    if (opts?.muted) q.set("mute", "1");
    if (opts?.origin) q.set("origin", opts.origin);
    const start = parsed.searchParams.get("t");
    if (start) q.set("start", start.replace(/[^\d]/g, ""));
    return `https://www.youtube.com/embed/${id}?${q.toString()}`;
  } catch {
    return undefined;
  }
}

function runYoutubeCommandWhenReady(
  iframe: HTMLIFrameElement | null,
  func: string,
  args: unknown[] = [],
) {
  if (!iframe) return;
  youtubePostCommand(iframe, func, args);
  window.setTimeout(() => youtubePostCommand(iframe, func, args), 180);
  window.setTimeout(() => youtubePostCommand(iframe, func, args), 520);
}

type HighlightVideoPlayerProps = {
  item: HighlightEditItem;
  embedSrc: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  videoPaused: boolean;
  playerMuted: boolean;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onClose: () => void;
  onExpand?: () => void;
  onMinimize?: () => void;
  showExpand?: boolean;
  showMinimize?: boolean;
  shellClassName?: string;
};

function HighlightVideoPlayer({
  item,
  embedSrc,
  iframeRef,
  videoPaused,
  playerMuted,
  onTogglePause,
  onToggleMute,
  onClose,
  onExpand,
  onMinimize,
  showExpand = false,
  showMinimize = false,
  shellClassName = "absolute inset-0 z-20 touch-none bg-black",
}: HighlightVideoPlayerProps) {
  const syncYoutubeAudio = useCallback(() => {
    runYoutubeCommandWhenReady(iframeRef.current, playerMuted ? "mute" : "unMute");
  }, [iframeRef, playerMuted]);

  const syncYoutubePlayback = useCallback(
    (paused: boolean) => {
      runYoutubeCommandWhenReady(iframeRef.current, paused ? "pauseVideo" : "playVideo");
    },
    [iframeRef],
  );

  return (
    <div className={shellClassName}>
      <iframe
        ref={iframeRef}
        title={`${item.title} video`}
        className="pointer-events-none absolute inset-0 h-full w-full border-0"
        src={embedSrc}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onLoad={() => {
          syncYoutubeAudio();
          syncYoutubePlayback(videoPaused);
        }}
      />
      <button
        type="button"
        className="absolute left-1/2 top-1/2 z-30 inline-flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/55 md:h-16 md:w-16"
        aria-label={videoPaused ? "Play video" : "Pause video"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePause();
        }}
      >
        {videoPaused ? (
          <Play className="h-7 w-7 fill-current pl-0.5 md:h-8 md:w-8" aria-hidden />
        ) : (
          <Pause className="h-7 w-7 fill-current md:h-8 md:w-8" aria-hidden />
        )}
      </button>
      <button
        type="button"
        className="absolute bottom-2 left-2 z-30 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/65 text-white backdrop-blur"
        aria-label={playerMuted ? "Unmute video" : "Mute video"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
      >
        {playerMuted ? (
          <VolumeX className="h-4 w-4" aria-hidden />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden />
        )}
      </button>
      {showExpand ? (
        <button
          type="button"
          className="absolute bottom-2 right-2 z-30 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/65 text-white backdrop-blur"
          aria-label={`Full screen: ${item.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onExpand?.();
          }}
        >
          <Maximize2 className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      {showMinimize ? (
        <button
          type="button"
          className="absolute bottom-2 right-2 z-30 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/65 text-white backdrop-blur"
          aria-label={`Exit full screen: ${item.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onMinimize?.();
          }}
        >
          <Minimize2 className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        className="absolute right-2 top-2 z-30 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/65 text-white backdrop-blur"
        aria-label={`Close video: ${item.title}`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function HighlightCard({
  item,
  physicalIndex,
  visualIndex,
  total,
  isDark,
  activePhysicalIndex,
  onPlaybackPauseChange,
  onEmbedLockChange,
  onCardInteract,
}: HighlightCardProps) {
  const sheenX = useSpring(50, { stiffness: 220, damping: 30 });
  const sheenOpacity = useSpring(0, { stiffness: 240, damping: 28 });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(false);
  /** True when user opened via the play button — keep iframe interactive and do not stop on hover leave. */
  const [embedLocked, setEmbedLocked] = useState(false);
  const [hoverAutoplayOk, setHoverAutoplayOk] = useState(true);
  const [playerMuted, setPlayerMuted] = useState(true);
  const [videoPaused, setVideoPaused] = useState(false);
  const [mobileLayout, setMobileLayout] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });
  const [mobileFullscreen, setMobileFullscreen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const embedOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const embedSrc = playing
    ? youtubeEmbedFromUrl(item.href, {
        // Always muted in URL so autoplay works on mobile; unmute via IFrame API on user tap.
        muted: true,
        origin: embedOrigin || undefined,
      })
    : undefined;

  const syncYoutubeAudio = useCallback(() => {
    const iframe = mobileFullscreen ? fullscreenIframeRef.current : iframeRef.current;
    runYoutubeCommandWhenReady(iframe, playerMuted ? "mute" : "unMute");
  }, [mobileFullscreen, playerMuted]);

  const syncYoutubePlayback = useCallback(
    (paused: boolean) => {
      const iframe = mobileFullscreen ? fullscreenIframeRef.current : iframeRef.current;
      runYoutubeCommandWhenReady(iframe, paused ? "pauseVideo" : "playVideo");
    },
    [mobileFullscreen],
  );

  const closeVideo = useCallback(() => {
    setMobileFullscreen(false);
    setEmbedLocked(false);
    setPlaying(false);
    setVideoPaused(false);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHoverAutoplayOk(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobileLayout(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!mobileFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileFullscreen]);

  useEffect(() => {
    if (!embedLocked) setMobileFullscreen(false);
  }, [embedLocked]);

  useEffect(() => {
    if (!playing) return;
    setVideoPaused(false);
    setPlayerMuted(true);
  }, [playing]);

  useEffect(() => {
    onPlaybackPauseChange?.(physicalIndex, playing);
    return () => onPlaybackPauseChange?.(physicalIndex, false);
  }, [playing, physicalIndex, onPlaybackPauseChange]);

  useEffect(() => {
    const locked = embedLocked && playing;
    onEmbedLockChange?.(physicalIndex, locked);
    return () => onEmbedLockChange?.(physicalIndex, false);
  }, [embedLocked, playing, physicalIndex, onEmbedLockChange]);

  useEffect(() => {
    if (!embedSrc) return;
    const t1 = window.setTimeout(syncYoutubeAudio, 120);
    const t2 = window.setTimeout(() => syncYoutubePlayback(false), 160);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [embedSrc, mobileFullscreen, syncYoutubeAudio, syncYoutubePlayback]);

  useEffect(() => {
    if (!embedSrc) return;
    syncYoutubeAudio();
  }, [playerMuted, embedSrc, mobileFullscreen, syncYoutubeAudio]);

  useEffect(() => {
    if (!embedSrc) return;
    syncYoutubePlayback(videoPaused);
  }, [videoPaused, embedSrc, mobileFullscreen, syncYoutubePlayback]);

  const showInlinePlayer = Boolean(embedSrc && !(mobileLayout && mobileFullscreen && embedLocked));
  const showFullscreenPlayer = Boolean(
    embedSrc && embedLocked && mobileLayout && mobileFullscreen && portalReady,
  );

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
        onPointerDown={(e) => {
          if (!item.href) return;
          onCardInteract?.(true);
          if (embedLocked || embedSrc) e.stopPropagation();
        }}
        onPointerUp={() => onCardInteract?.(false)}
        onPointerCancel={() => onCardInteract?.(false)}
      >
        <div className={`relative aspect-[9/16] w-full ${item.href ? "cursor-default" : ""}`}>
          {!embedSrc ? (
            <>
              <Image
                src={item.thumbnail}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 64vw, 240px"
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
          ) : showInlinePlayer ? (
            <HighlightVideoPlayer
              item={item}
              embedSrc={embedSrc}
              iframeRef={iframeRef}
              videoPaused={videoPaused}
              playerMuted={playerMuted}
              onTogglePause={() => setVideoPaused((p) => !p)}
              onToggleMute={() => setPlayerMuted((m) => !m)}
              onClose={closeVideo}
              onExpand={() => setMobileFullscreen(true)}
              showExpand={mobileLayout && embedLocked && !mobileFullscreen}
            />
          ) : embedLocked && mobileLayout && mobileFullscreen ? (
            <div className="absolute inset-0 z-20 bg-black" aria-hidden />
          ) : null}
          {showFullscreenPlayer && embedSrc
            ? createPortal(
                <div className="fixed inset-0 z-[120] bg-black">
                  <div className="absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/80 to-transparent px-4 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <p className="line-clamp-2 pr-10 text-sm font-medium text-white">{item.title}</p>
                    {item.caption ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-white/70">{item.caption}</p>
                    ) : null}
                  </div>
                  <HighlightVideoPlayer
                    item={item}
                    embedSrc={embedSrc}
                    iframeRef={fullscreenIframeRef}
                    videoPaused={videoPaused}
                    playerMuted={playerMuted}
                    onTogglePause={() => setVideoPaused((p) => !p)}
                    onToggleMute={() => setPlayerMuted((m) => !m)}
                    onClose={closeVideo}
                    onMinimize={() => setMobileFullscreen(false)}
                    showMinimize
                    shellClassName="absolute inset-0 touch-none bg-black"
                  />
                </div>,
                document.body,
              )
            : null}
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
                  setVideoPaused(false);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onCardInteract?.(true);
                }}
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
  sectionTitleClass?: string;
};

export function HighlightedEditsGallery({
  items,
  isDark,
  sectionTitleClass = SECTION_TITLE_ON_HERO,
}: HighlightedEditsGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stripARef = useRef<HTMLDivElement>(null);
  const stripBRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef({ left: 0, right: 0 });
  const cycleLenRef = useRef(0);
  const pointerInsideRef = useRef(false);
  const scrollPauseCardsRef = useRef(new Set<number>());
  const embedLockCardsRef = useRef(new Set<number>());
  const cardInteractRef = useRef(false);
  const draggingRef = useRef(false);
  const animatingRef = useRef(false);
  const wrappingRef = useRef(false);
  const x = useMotionValue(0);
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });
  const [activePhysicalIndex, setActivePhysicalIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mobileLayout, setMobileLayout] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });
  const mobileLayoutRef = useRef(mobileLayout);
  const [embedLockedActive, setEmbedLockedActive] = useState(false);
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
    const W = cycleLenRef.current;
    const next =
      mobileLayoutRef.current && W > 0
        ? { left: -W, right: 0 }
        : { left: Math.min(0, c.clientWidth - t.scrollWidth), right: 0 };
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
    runAnimate(normalizeTrackX(x.get() + STEP, W));
  }, [runAnimate, x]);

  const slideNext = useCallback(() => {
    const W = cycleLenRef.current;
    if (W <= 0) return;
    runAnimate(normalizeTrackX(x.get() - STEP, W));
  }, [runAnimate, x]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobileLayout(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    mobileLayoutRef.current = mobileLayout;
    measureConstraints();
  }, [mobileLayout, measureConstraints]);

  const wrapTrackPosition = useCallback(
    (value: number) => normalizeTrackX(value, cycleLenRef.current),
    [],
  );

  const handlePlaybackPauseChange = useCallback((cardId: number, pause: boolean) => {
    if (pause) scrollPauseCardsRef.current.add(cardId);
    else scrollPauseCardsRef.current.delete(cardId);
  }, []);

  const handleEmbedLockChange = useCallback((cardId: number, locked: boolean) => {
    if (locked) embedLockCardsRef.current.add(cardId);
    else embedLockCardsRef.current.delete(cardId);
    setEmbedLockedActive(embedLockCardsRef.current.size > 0);
  }, []);

  const handleCardInteract = useCallback((active: boolean) => {
    cardInteractRef.current = active;
  }, []);

  const shouldPauseAutoscroll = useCallback(() => {
    if (cardInteractRef.current || scrollPauseCardsRef.current.size > 0) return true;
    // Desktop only: pause while the cursor is over the strip (hover previews).
    if (!mobileLayoutRef.current && pointerInsideRef.current) return true;
    return false;
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const W = cycleLenRef.current;
      if (
        W > 0 &&
        !mobileLayoutRef.current &&
        !shouldPauseAutoscroll() &&
        !draggingRef.current &&
        !animatingRef.current &&
        !embedLockedActive
      ) {
        const next = wrapTrackPosition(x.get() - AUTO_SCROLL_DESKTOP * dt);
        x.set(next);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [reducedMotion, embedLockedActive, shouldPauseAutoscroll, wrapTrackPosition, x]);

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

  useMotionValueEvent(x, "change", (latest) => {
    const W = cycleLenRef.current;
    if (W > 0 && !wrappingRef.current) {
      const wrapped = wrapTrackPosition(latest);
      if (wrapped !== latest) {
        wrappingRef.current = true;
        x.set(wrapped);
        wrappingRef.current = false;
      }
    }
    scheduleGlowRecompute(false);
  });

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
      <div className="relative z-20 mx-auto mb-4 flex max-w-6xl items-end justify-between gap-4 px-6 md:mb-5 md:px-10">
        <h2 id="highlighted-edits-heading" className={sectionTitleClass}>
          Highlighted edits
        </h2>
        <span
          className="shrink-0 font-mono text-xs tabular-nums tracking-widest text-white/80 sm:text-sm"
          aria-hidden
        >
          (01)
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-x-clip overflow-y-visible py-4 md:py-5"
        onPointerEnter={() => {
          pointerInsideRef.current = true;
        }}
        onPointerLeave={() => {
          pointerInsideRef.current = false;
        }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-1/2 z-0 h-[min(340px,68vw)] w-[min(240px,60vw)] -translate-y-1/2 rounded-full opacity-45 blur-3xl md:opacity-[0.52]"
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
          className="relative z-10 flex cursor-grab touch-pan-y select-none gap-4 pl-12 pr-12 active:cursor-grabbing sm:pl-14 sm:pr-14 md:pl-[4rem] md:pr-[4rem]"
          style={{ x }}
          drag={embedLockedActive ? false : "x"}
          dragConstraints={constraints}
          dragElastic={0.12}
          dragMomentum={!embedLockedActive}
          dragTransition={{ bounceStiffness: 340, bounceDamping: 24, power: 0.32, min: 0, max: 0 }}
          onDragStart={() => {
            draggingRef.current = true;
          }}
          onDragEnd={() => {
            draggingRef.current = false;
            const wrapped = wrapTrackPosition(x.get());
            if (wrapped !== x.get()) x.set(wrapped);
            measureConstraints();
            requestAnimationFrame(measureConstraints);
          }}
        >
          <div ref={stripARef} className="flex shrink-0 gap-4">
            {items.map((item, index) => (
              <HighlightCard
                key={`a-${item.title}-${index}`}
                item={item}
                physicalIndex={index}
                visualIndex={index}
                total={items.length}
                isDark={isDark}
                activePhysicalIndex={activePhysicalIndex}
                onPlaybackPauseChange={handlePlaybackPauseChange}
                onEmbedLockChange={handleEmbedLockChange}
                onCardInteract={handleCardInteract}
              />
            ))}
          </div>
          <div ref={stripBRef} className="flex shrink-0 gap-4">
            {items.map((item, index) => (
              <HighlightCard
                key={`b-${item.title}-${index}`}
                item={item}
                physicalIndex={index + items.length}
                visualIndex={index}
                total={items.length}
                isDark={isDark}
                activePhysicalIndex={activePhysicalIndex}
                onPlaybackPauseChange={handlePlaybackPauseChange}
                onEmbedLockChange={handleEmbedLockChange}
                onCardInteract={handleCardInteract}
              />
            ))}
          </div>
          <div className="shrink-0" style={{ width: "min(4.5rem, 12vw)" }} aria-hidden />
        </motion.div>
      </div>
    </motion.section>
  );
}
