"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { youtubeVideoIdFromUrl } from "@/lib/youtube";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PlayerCommand = "mute" | "unMute" | "pauseVideo" | "playVideo";

function embedSrc(videoId: string, muted: boolean, startSeconds?: number): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: muted ? "1" : "0",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    controls: "0",
    enablejsapi: "1",
  });
  if (startSeconds != null && startSeconds > 0) {
    params.set("start", String(Math.floor(startSeconds)));
  }
  if (typeof window !== "undefined") {
    params.set("origin", window.location.origin);
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function postToPlayer(iframe: HTMLIFrameElement | null, command: PlayerCommand) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func: command, args: [] }),
    "*",
  );
}

export type HighlightEditItem = {
  title: string;
  views: string;
  caption?: string;
  thumbnail: string;
  thumbUnoptimized?: boolean;
  href?: string;
  badge?: string;
};

type HighlightedEditsGalleryProps = {
  items: HighlightEditItem[];
  isDark: boolean;
  sectionTitleClass?: string;
};

function posterFor(item: HighlightEditItem): string {
  if (item.thumbnail) return item.thumbnail;
  const id = youtubeVideoIdFromUrl(item.href ?? "");
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
}

type CardProps = {
  item: HighlightEditItem;
  index: number;
  isActive: boolean;
  isDark: boolean;
  muted: boolean;
  playbackPaused: boolean;
  onOpen: (index: number) => void;
  onClose: () => void;
  onPause: () => void;
  onResume: () => void;
  onToggleMute: () => void;
};

function HighlightCard({
  item,
  index,
  isActive,
  isDark,
  muted,
  playbackPaused,
  onOpen,
  onClose,
  onPause,
  onResume,
  onToggleMute,
}: CardProps) {
  const poster = posterFor(item);
  const videoId = youtubeVideoIdFromUrl(item.href ?? "");
  const playable = Boolean(videoId);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const ignoreEndRef = useRef(false);
  const wasPausedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeMounted = isActive && Boolean(videoId);
  const playing = isActive && !playbackPaused;
  const [progress, setProgress] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false);
  const expanded = isFullscreen || cinemaMode;
  // Always start muted in the embed URL — browsers allow that for autoplay.
  // Sound is restored immediately via postMessage when the parent has muted=false.
  const sessionEmbedSrc = useMemo(() => {
    if (!iframeMounted || !videoId) return null;
    return embedSrc(videoId, true);
  }, [iframeMounted, videoId]);

  const clearHideTimer = useCallback(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideTimer();
    if (!playing || playbackPaused) return;
    hideControlsTimerRef.current = setTimeout(() => setControlsVisible(false), 2000);
  }, [playing, playbackPaused, clearHideTimer]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === cardRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isActive) {
      wasPausedRef.current = false;
      setCinemaMode(false);
      if (document.fullscreenElement === cardRef.current) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isActive]);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  useEffect(() => {
    if (!cinemaMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCinemaMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cinemaMode]);

  useEffect(() => {
    clearHideTimer();
    if (!playing || playbackPaused) {
      setControlsVisible(true);
      return;
    }
    setControlsVisible(true);
    scheduleHideControls();
    return clearHideTimer;
  }, [playing, playbackPaused, scheduleHideControls, clearHideTimer]);

  const revealControls = () => {
    setControlsVisible(true);
    scheduleHideControls();
  };

  const bumpControlsTimer = () => {
    if (playing && !playbackPaused) scheduleHideControls();
  };

  const handlePointerMove = () => {
    if (!playing || playbackPaused) return;
    setControlsVisible(true);
    scheduleHideControls();
  };

  const handlePointerLeave = () => {
    if (playing && !playbackPaused) {
      clearHideTimer();
      setControlsVisible(false);
    }
  };

  const showControls = playbackPaused || !playing || controlsVisible;
  const controlsOpacityClass = showControls ? "opacity-100" : "opacity-0";
  const controlHitClass = showControls ? "pointer-events-auto" : "pointer-events-none";
  const centerShowsPlay = playbackPaused;

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || !playing || playbackPaused || showControls) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - start.x);
    const dy = Math.abs(touch.clientY - start.y);
    if (dx < 12 && dy < 12) revealControls();
  };

  useEffect(() => {
    if (!iframeMounted) {
      setProgress(0);
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      let data: { event?: string; info?: number | { currentTime?: number; duration?: number } };
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data.event === "onStateChange" && data.info === 0 && !ignoreEndRef.current) {
        onClose();
      }
      if (data.event === "infoDelivery" && data.info && typeof data.info === "object") {
        const { currentTime = 0, duration = 0 } = data.info;
        if (duration > 0) setProgress(Math.min(100, (currentTime / duration) * 100));
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [iframeMounted, onClose]);

  useEffect(() => {
    if (!iframeMounted) return;
    postToPlayer(iframeRef.current, muted ? "mute" : "unMute");
  }, [muted, iframeMounted]);

  useEffect(() => {
    if (!iframeMounted) return;
    if (playbackPaused) {
      postToPlayer(iframeRef.current, "pauseVideo");
      wasPausedRef.current = true;
    } else if (wasPausedRef.current) {
      postToPlayer(iframeRef.current, "playVideo");
      wasPausedRef.current = false;
    }
  }, [playbackPaused, iframeMounted]);

  const handleCenterPlay = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLButtonElement).blur();
    bumpControlsTimer();
    postToPlayer(iframeRef.current, "playVideo");
    wasPausedRef.current = false;
    onResume();
  };

  const handlePause = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLButtonElement).blur();
    bumpControlsTimer();
    ignoreEndRef.current = true;
    postToPlayer(iframeRef.current, "pauseVideo");
    wasPausedRef.current = true;
    onPause();
    window.setTimeout(() => {
      ignoreEndRef.current = false;
    }, 300);
  };

  const handleResume = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleCenterPlay(e);
  };

  const handleToggleMute = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLButtonElement).blur();
    bumpControlsTimer();
    onToggleMute();
  };

  const handleClose = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCinemaMode(false);
    if (document.fullscreenElement === cardRef.current) {
      document.exitFullscreen().catch(() => {});
    }
    ignoreEndRef.current = true;
    onClose();
    window.setTimeout(() => {
      ignoreEndRef.current = false;
    }, 300);
  };

  const exitExpanded = useCallback(async () => {
    setCinemaMode(false);
    if (document.fullscreenElement === cardRef.current) {
      await document.exitFullscreen().catch(() => {});
    }
  }, []);

  const toggleFullscreen = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLButtonElement).blur();
    bumpControlsTimer();
    const el = cardRef.current;
    if (!el) return;

    if (expanded) {
      await exitExpanded();
      return;
    }

    try {
      await el.requestFullscreen();
    } catch {
      setCinemaMode(true);
    }
  };

  // Viewfinder-style corner brackets instead of a full border — reads as
  // "camera/editor framing" rather than a generic card outline.
  const bracketColor = isDark ? "border-white/35" : "border-black/35";
  const corner = `pointer-events-none absolute h-4 w-4 ${bracketColor} z-20 transition-opacity duration-300`;

  return (
    <div
      ref={cardRef}
      className={`group relative aspect-[9/16] w-[200px] shrink-0 snap-center overflow-hidden rounded-2xl sm:w-[220px] ${
        isDark ? "bg-white/5" : "bg-black/5"
      } ${
        cinemaMode
          ? "fixed inset-0 z-[100] flex h-dvh w-dvw max-w-none items-center justify-center rounded-none bg-black"
          : ""
      } fullscreen:flex fullscreen:h-dvh fullscreen:w-dvw fullscreen:max-w-none fullscreen:items-center fullscreen:justify-center fullscreen:rounded-none fullscreen:bg-black`}
    >
      <div
        className={`relative h-full w-full overflow-hidden rounded-2xl ${
          expanded
            ? "aspect-[9/16] h-full max-h-dvh w-auto max-w-[min(100vw,calc(100dvh*9/16))] rounded-none"
            : "h-full w-full"
        } fullscreen:aspect-[9/16] fullscreen:h-full fullscreen:max-h-dvh fullscreen:w-auto fullscreen:max-w-[min(100vw,calc(100dvh*9/16))] fullscreen:rounded-none`}
        onMouseEnter={handlePointerMove}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onTouchStart={playing ? handleTouchStart : undefined}
        onTouchEnd={playing ? handleTouchEnd : undefined}
      >
      {!expanded ? (
        <>
      <span className={`${corner} left-0 top-0 border-l-2 border-t-2 rounded-tl-lg opacity-60 group-hover:opacity-100`} />
      <span className={`${corner} right-0 top-0 border-r-2 border-t-2 rounded-tr-lg opacity-60 group-hover:opacity-100`} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg opacity-60 group-hover:opacity-100`} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg opacity-60 group-hover:opacity-100`} />
        </>
      ) : null}

      {isActive ? (
        <>
          {sessionEmbedSrc ? (
            <iframe
              ref={iframeRef}
              key={videoId}
              src={sessionEmbedSrc}
              title={item.title || "Highlight video"}
              className="pointer-events-none absolute inset-0 z-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => {
                iframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: "listening" }),
                  "*",
                );
                postToPlayer(iframeRef.current, "playVideo");
                postToPlayer(iframeRef.current, muted ? "mute" : "unMute");
              }}
            />
          ) : null}

          {playbackPaused ? (
            <div className="pointer-events-none absolute inset-0 z-10 bg-black/25" aria-hidden />
          ) : null}

          <div
            className={`pointer-events-none absolute inset-0 z-30 transition-opacity duration-300 ${controlsOpacityClass}`}
          >
            <button
              type="button"
              aria-label={centerShowsPlay ? "Play video" : "Pause video"}
              onClick={centerShowsPlay ? handleCenterPlay : handlePause}
              className={`absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur ${controlHitClass}`}
            >
              {centerShowsPlay ? (
                <Play className="h-6 w-6 translate-x-[2px]" fill="currentColor" />
              ) : (
                <Pause className="h-6 w-6" fill="currentColor" />
              )}
            </button>

            <div className={`absolute right-2 top-2 flex gap-2 ${controlHitClass}`}>
              <button
                type="button"
                aria-label={muted ? "Unmute" : "Mute"}
                onClick={handleToggleMute}
                className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-black/75 text-white shadow-lg backdrop-blur"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label={expanded ? "Exit fullscreen" : "Enter fullscreen"}
                onClick={toggleFullscreen}
                className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-black/75 text-white shadow-lg backdrop-blur"
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label="Close video"
                onClick={handleClose}
                className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-black/45 text-white/80 shadow-lg backdrop-blur transition-colors hover:bg-black/75 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
              <div
                className="h-full bg-white transition-[width] duration-200 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <div
          role={playable ? "button" : undefined}
          tabIndex={playable ? 0 : undefined}
          onClick={() => playable && onOpen(index)}
          onKeyDown={(e) => {
            if (!playable) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen(index);
            }
          }}
          className={`absolute inset-0 h-full w-full ${playable ? "cursor-pointer" : ""}`}
          aria-label={playable ? (item.title ? `Play ${item.title}` : "Play video") : undefined}
        >
          {poster ? (
            <Image
              src={poster}
              alt={item.title || "Highlight"}
              fill
              sizes="220px"
              unoptimized={item.thumbUnoptimized}
              // Slow Ken Burns drift on hover/focus — signals motion-design
              // intent without re-introducing autoplay. Long duration reads
              // as deliberate, not jumpy.
              className="object-cover transition-transform duration-[6000ms] ease-out group-hover:scale-110 group-focus-visible:scale-110"
            />
          ) : (
            <div className={`h-full w-full ${isDark ? "bg-white/10" : "bg-black/10"}`} />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

          {item.badge ? (
            <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              {item.badge}
            </span>
          ) : null}

          {playable ? (
            <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
              {/* Ring that fills on hover — reads as a "tool" affordance,
                  not just a generic play icon. */}
              <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90 text-white/70">
                <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.35" />
                <circle
                  cx="24"
                  cy="24"
                  r="21"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={2 * Math.PI * 21}
                  strokeDashoffset={2 * Math.PI * 21}
                  className="transition-[stroke-dashoffset] duration-500 ease-out group-hover:[stroke-dashoffset:0]"
                />
              </svg>
              <span className="relative flex h-full w-full scale-90 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-transform duration-300 group-hover:scale-100">
                <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />
              </span>
            </span>
          ) : null}

          {(item.title || item.views || item.caption) && (
            <div className="absolute inset-x-0 bottom-0 p-3 text-left">
              {item.views ? (
                <p className="text-lg font-bold leading-none text-white">{item.views}</p>
              ) : null}
              {item.title ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/90">
                  {item.title}
                </p>
              ) : null}
              {item.caption ? <p className="text-[11px] text-white/70">{item.caption}</p> : null}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function GalleryHeader({
  isDark,
  sectionTitleClass,
  onPrev,
  onNext,
  constrained = false,
}: {
  isDark: boolean;
  sectionTitleClass?: string;
  onPrev: () => void;
  onNext: () => void;
  constrained?: boolean;
}) {
  const navBtnClass = `flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border transition-colors ${
    isDark
      ? "border-white/15 bg-black/40 text-white hover:bg-white/10"
      : "border-black/15 bg-white/80 text-black hover:bg-black/5"
  }`;

  const inner = (
    <>
      <h3
        id="highlighted-edits-heading"
        className={sectionTitleClass ?? "text-xs font-semibold uppercase tracking-[0.22em] md:text-sm"}
      >
        Highlighted edits
      </h3>
      <div className="flex gap-2">
        <button
          type="button"
          aria-label="Show previous highlighted edits"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className={navBtnClass}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Show next highlighted edits"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className={navBtnClass}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );

  if (constrained) {
    return (
      <div className="relative z-30 mx-auto flex max-w-6xl items-end justify-between gap-4 px-6 md:px-10">
        {inner}
      </div>
    );
  }

  return <div className="relative z-30 flex items-end justify-between">{inner}</div>;
}

function MobileRail({
  items,
  isDark,
  sectionTitleClass,
}: {
  items: HighlightEditItem[];
  isDark: boolean;
  sectionTitleClass?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [playbackPaused, setPlaybackPaused] = useState(false);

  const close = useCallback(() => {
    setActiveId(null);
    setPlaybackPaused(false);
  }, []);

  const open = useCallback((index: number) => {
    setMuted(false);
    setPlaybackPaused(false);
    setActiveId(index);
  }, []);

  const pausePlayback = useCallback(() => setPlaybackPaused(true), []);
  const resumePlayback = useCallback(() => setPlaybackPaused(false), []);

  const scrollByCards = useCallback(
    (dir: 1 | -1) => {
      close();
      const rail = railRef.current;
      if (!rail) return;
      requestAnimationFrame(() => {
        rail.scrollBy({ left: dir * 236, behavior: "smooth" });
      });
    },
    [close],
  );

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || activeId === null) return;

    let lastLeft = rail.scrollLeft;
    const onScroll = () => {
      if (playbackPaused) return;
      const moved = Math.abs(rail.scrollLeft - lastLeft);
      lastLeft = rail.scrollLeft;
      if (moved >= 16) close();
    };

    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => rail.removeEventListener("scroll", onScroll);
  }, [activeId, playbackPaused, close]);

  useEffect(() => {
    if (activeId !== null) return;
    document.body.style.overflow = "";
  }, [activeId]);

  return (
    <div className="space-y-5">
      <GalleryHeader
        isDark={isDark}
        sectionTitleClass={sectionTitleClass}
        onPrev={() => scrollByCards(-1)}
        onNext={() => scrollByCards(1)}
      />
      <div
        ref={railRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden pb-4 overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <div key={`${item.href ?? item.title}-${index}`} data-card className="shrink-0">
            <HighlightCard
              item={item}
              index={index}
              isActive={activeId === index}
              isDark={isDark}
              muted={muted}
              playbackPaused={activeId === index && playbackPaused}
              onOpen={open}
              onClose={close}
              onPause={pausePlayback}
              onResume={resumePlayback}
              onToggleMute={() => setMuted((m) => !m)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const CARD_STEP = 220 + 16;
/** Desktop auto-marquee only — mobile uses native swipe scroll (unchanged). */
const MARQUEE_SPEED_PX_PER_SEC = 72;

function DesktopMarquee({
  items,
  isDark,
  sectionTitleClass,
}: {
  items: HighlightEditItem[];
  isDark: boolean;
  sectionTitleClass?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const cycleLenRef = useRef(items.length * CARD_STEP);
  // 1 = full speed, 0 = stopped. Lerped every frame instead of snapping —
  // an instant stop reads as a glitch, a deceleration reads as intentional.
  const speedTargetRef = useRef(1);
  const speedRef = useRef(1);
  const hoveredRef = useRef(false);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);

  const [activeId, setActiveId] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [playbackPaused, setPlaybackPaused] = useState(false);

  useEffect(() => {
    cycleLenRef.current = items.length * CARD_STEP || 1;
  }, [items.length]);

  // Keep the lerp target in sync with whether a video is open. If a video
  // closes while the cursor happens to still be hovering, stay paused
  // rather than snapping back to full speed.
  useEffect(() => {
    speedTargetRef.current = activeId !== null || hoveredRef.current ? 0 : 1;
  }, [activeId]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      // Ease the current speed toward the target every frame — this is
      // the "decelerate, don't snap" feel.
      const lerpRate = 1 - Math.pow(0.001, dt); // ~300ms to settle
      speedRef.current += (speedTargetRef.current - speedRef.current) * lerpRate;

      if (!draggingRef.current && speedRef.current > 0.001) {
        offsetRef.current += MARQUEE_SPEED_PX_PER_SEC * speedRef.current * dt;
        const cycle = cycleLenRef.current;
        if (cycle > 0) offsetRef.current = ((offsetRef.current % cycle) + cycle) % cycle;
      }

      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const nudge = useCallback((dir: 1 | -1) => {
    setActiveId(null);
    setPlaybackPaused(false);
    offsetRef.current += dir * CARD_STEP;
    const cycle = cycleLenRef.current;
    if (cycle > 0) offsetRef.current = ((offsetRef.current % cycle) + cycle) % cycle;
  }, []);

  const open = useCallback((index: number) => {
    setMuted(false);
    setPlaybackPaused(false);
    setActiveId(index);
  }, []);

  const close = useCallback(() => {
    setActiveId(null);
    setPlaybackPaused(false);
  }, []);

  const pausePlayback = useCallback(() => setPlaybackPaused(true), []);
  const resumePlayback = useCallback(() => setPlaybackPaused(false), []);

  if (items.length === 0) return null;

  const strip = (copyKey: string, indexOffset: number) =>
    items.map((item, i) => (
      <div key={`${copyKey}-${item.href ?? item.title}-${i}`} className="shrink-0">
        <HighlightCard
          item={item}
          index={i + indexOffset}
          isActive={activeId === i + indexOffset}
          isDark={isDark}
          muted={muted}
          playbackPaused={activeId === i + indexOffset && playbackPaused}
          onOpen={open}
          onClose={close}
          onPause={pausePlayback}
          onResume={resumePlayback}
          onToggleMute={() => setMuted((m) => !m)}
        />
      </div>
    ));

  return (
    <div className="space-y-5">
      <GalleryHeader
        isDark={isDark}
        sectionTitleClass={sectionTitleClass}
        onPrev={() => nudge(-1)}
        onNext={() => nudge(1)}
        constrained
      />

      <div
        className="relative w-full overflow-hidden py-4"
        onMouseEnter={() => {
          hoveredRef.current = true;
          if (activeId === null) speedTargetRef.current = 0;
        }}
        onMouseLeave={() => {
          hoveredRef.current = false;
          draggingRef.current = false;
          if (activeId === null) speedTargetRef.current = 1;
        }}
        onPointerDown={(e) => {
          if (activeId !== null) return;
          if ((e.target as HTMLElement).closest("button")) return;
          draggingRef.current = true;
          dragStartXRef.current = e.clientX;
          dragStartOffsetRef.current = offsetRef.current;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          const dx = e.clientX - dragStartXRef.current;
          let next = dragStartOffsetRef.current - dx;
          const cycle = cycleLenRef.current;
          if (cycle > 0) next = ((next % cycle) + cycle) % cycle;
          offsetRef.current = next;
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {
            /* pointer may not be captured */
          }
        }}
      >
        <div ref={trackRef} className="flex gap-4 will-change-transform">
          {strip("a", 0)}
          {strip("b", items.length)}
        </div>
      </div>
    </div>
  );
}

const DESKTOP_QUERY = "(min-width: 1024px)";

export function HighlightedEditsGallery({
  items,
  isDark,
  sectionTitleClass,
}: HighlightedEditsGalleryProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const visible = items.filter(
    (it) => youtubeVideoIdFromUrl(it.href ?? "") || it.title?.trim() || it.views?.trim(),
  );
  if (visible.length === 0) return null;

  return (
    <section
      id="highlighted-edits"
      className={
        isDesktop
          ? "relative left-1/2 z-10 w-screen max-w-[100vw] -translate-x-1/2 scroll-mt-28 overflow-x-clip"
          : "scroll-mt-28"
      }
      aria-labelledby="highlighted-edits-heading"
    >
      {isDesktop ? (
        <DesktopMarquee items={visible} isDark={isDark} sectionTitleClass={sectionTitleClass} />
      ) : (
        <MobileRail items={visible} isDark={isDark} sectionTitleClass={sectionTitleClass} />
      )}
    </section>
  );
}
