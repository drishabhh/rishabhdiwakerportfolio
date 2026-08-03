"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { youtubeVideoIdFromUrl } from "@/lib/youtube";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

type PlayerCommand = "mute" | "unMute" | "pauseVideo" | "playVideo" | "seekTo";

const YT_ORIGIN = "https://www.youtube.com";

/** iOS / touch browsers rarely support element fullscreen — use cinema overlay instead. */
function prefersCinemaFullscreen(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 1023px)").matches
  );
}

type FullscreenCapableElement = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

async function requestElementFullscreen(el: HTMLElement) {
  const target = el as FullscreenCapableElement;
  const req =
    target.requestFullscreen?.bind(target) ??
    target.webkitRequestFullscreen?.bind(target);
  if (!req) throw new Error("Fullscreen API unavailable");
  await req();
}

function exitElementFullscreen() {
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
  if (document.fullscreenElement) {
    return document.exitFullscreen().catch(() => {});
  }
  if (doc.webkitExitFullscreen) {
    return Promise.resolve(doc.webkitExitFullscreen()).catch(() => {});
  }
  return Promise.resolve();
}

function isCardFullscreen(el: HTMLElement | null): boolean {
  if (!el) return false;
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement === el || doc.webkitFullscreenElement === el;
}

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
  if (videoId) {
    params.set("loop", "1");
    params.set("playlist", videoId);
  }
  if (startSeconds != null && startSeconds > 0) {
    params.set("start", String(Math.floor(startSeconds)));
  }
  if (typeof window !== "undefined") {
    params.set("origin", window.location.origin);
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function postToPlayer(
  iframe: HTMLIFrameElement | null,
  command: PlayerCommand,
  args: (number | boolean)[] = [],
) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func: command, args }),
    YT_ORIGIN,
  );
}

function listenToPlayer(iframe: HTMLIFrameElement | null) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), YT_ORIGIN);
}

/** Kick playback after the embed is ready — onLoad alone is often too early on mobile. */
function kickPlayback(iframe: HTMLIFrameElement | null, muted: boolean) {
  if (!iframe) return;
  listenToPlayer(iframe);
  postToPlayer(iframe, "playVideo");
  postToPlayer(iframe, muted ? "mute" : "unMute");
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
  /** When set, skip open if the marquee just finished a drag. */
  dragGuardRef?: React.MutableRefObject<boolean>;
  /** Mobile rail: cinema fullscreen + always-visible control buttons. */
  touchUi?: boolean;
  onPointerEnterCard?: () => void;
  onPointerLeaveCard?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  onOpen: () => void;
  onClose: () => void;
  onPause: () => void;
  onResume: () => void;
  onToggleMute: () => void;
};

function HighlightCard({
  item,
  index: _index,
  isActive,
  isDark,
  muted,
  playbackPaused,
  dragGuardRef,
  touchUi = false,
  onPointerEnterCard,
  onPointerLeaveCard,
  onExpandedChange,
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
  const playbackKickTimersRef = useRef<number[]>([]);
  const mutedRef = useRef(muted);
  const playbackPausedRef = useRef(playbackPaused);
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

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    playbackPausedRef.current = playbackPaused;
  }, [playbackPaused]);

  const clearPlaybackKickTimers = useCallback(() => {
    playbackKickTimersRef.current.forEach((id) => window.clearTimeout(id));
    playbackKickTimersRef.current = [];
  }, []);

  const schedulePlaybackKick = useCallback(
    (iframe: HTMLIFrameElement | null, delayMs = 0) => {
      const id = window.setTimeout(() => {
        if (!playbackPausedRef.current) {
          kickPlayback(iframe, mutedRef.current);
        }
      }, delayMs);
      playbackKickTimersRef.current.push(id);
    },
    [],
  );

  const clearHideTimer = useCallback(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideTimer();
    if (touchUi || !playing || playbackPaused) return;
    hideControlsTimerRef.current = setTimeout(() => setControlsVisible(false), 2000);
  }, [playing, playbackPaused, clearHideTimer, touchUi]);

  useEffect(() => {
    const sync = () => setIsFullscreen(isCardFullscreen(cardRef.current));
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  /** Reparent to body so fixed cinema overlay escapes overflow-x rail clipping on mobile. */
  useEffect(() => {
    if (!cinemaMode) return;
    const el = cardRef.current;
    if (!el?.parentElement) return;

    const parent = el.parentElement;
    const placeholder = document.createComment("highlight-cinema-anchor");
    parent.insertBefore(placeholder, el);
    document.body.appendChild(el);

    return () => {
      if (placeholder.parentNode) {
        placeholder.parentNode.insertBefore(el, placeholder);
        placeholder.remove();
      }
    };
  }, [cinemaMode]);

  useEffect(() => {
    if (!isActive) {
      wasPausedRef.current = false;
      setCinemaMode(false);
      if (isCardFullscreen(cardRef.current)) {
        exitElementFullscreen();
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

  const showControls = playbackPaused || !playing || controlsVisible || touchUi || cinemaMode;
  const controlsOpacityClass = showControls ? "opacity-100" : "opacity-0";
  const controlHitClass = showControls ? "pointer-events-auto" : "pointer-events-none";
  const topBarPinned = touchUi || cinemaMode;
  const topBarClass = topBarPinned
    ? "opacity-100 pointer-events-auto"
    : `${controlsOpacityClass} ${controlHitClass}`;
  const centerShowsPlay = playbackPaused;

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - start.x);
    const dy = Math.abs(touch.clientY - start.y);
    if (dx < 12 && dy < 12) revealControls();
  };

  useEffect(() => {
    if (!iframeMounted) {
      setProgress(0);
      clearPlaybackKickTimers();
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
      if (data.event === "onReady" && !playbackPausedRef.current) {
        kickPlayback(iframeRef.current, mutedRef.current);
      }
      if (
        data.event === "onStateChange" &&
        data.info === 2 &&
        !playbackPausedRef.current &&
        !wasPausedRef.current
      ) {
        postToPlayer(iframeRef.current, "playVideo");
      }
      if (data.event === "onStateChange" && data.info === 0 && !ignoreEndRef.current) {
        if (playbackPausedRef.current || wasPausedRef.current) return;
        postToPlayer(iframeRef.current, "seekTo", [0, true]);
        postToPlayer(iframeRef.current, "playVideo");
        setProgress(0);
      }
      if (data.event === "infoDelivery" && data.info && typeof data.info === "object") {
        const { currentTime = 0, duration = 0 } = data.info;
        if (duration > 0) setProgress(Math.min(100, (currentTime / duration) * 100));
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      clearPlaybackKickTimers();
    };
  }, [iframeMounted, onClose, clearPlaybackKickTimers]);

  useEffect(() => {
    if (!iframeMounted) return;
    listenToPlayer(iframeRef.current);
    if (playbackPaused) {
      postToPlayer(iframeRef.current, "pauseVideo");
      wasPausedRef.current = true;
      return;
    }
    wasPausedRef.current = false;
    kickPlayback(iframeRef.current, muted);
    schedulePlaybackKick(iframeRef.current, 200);
    schedulePlaybackKick(iframeRef.current, 600);
    schedulePlaybackKick(iframeRef.current, 1200);
  }, [iframeMounted, playbackPaused, muted, schedulePlaybackKick]);

  useEffect(() => {
    if (!iframeMounted) return;
    postToPlayer(iframeRef.current, muted ? "mute" : "unMute");
  }, [muted, iframeMounted]);

  useEffect(() => {
    if (!iframeMounted || playbackPaused) return;
    if (!wasPausedRef.current) return;
    postToPlayer(iframeRef.current, "playVideo");
    wasPausedRef.current = false;
  }, [playbackPaused, iframeMounted]);

  const handleCenterPlay = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLButtonElement).blur();
    bumpControlsTimer();
    kickPlayback(iframeRef.current, mutedRef.current);
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
    exitElementFullscreen();
    ignoreEndRef.current = true;
    onClose();
    window.setTimeout(() => {
      ignoreEndRef.current = false;
    }, 300);
  };

  const exitExpanded = useCallback(async () => {
    setCinemaMode(false);
    await exitElementFullscreen();
  }, []);

  const toggleFullscreen = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLButtonElement).blur();
    bumpControlsTimer();
    setControlsVisible(true);

    if (expanded) {
      await exitExpanded();
      return;
    }

    if (touchUi || prefersCinemaFullscreen()) {
      flushSync(() => setCinemaMode(true));
      return;
    }

    const el = cardRef.current;
    if (!el) return;

    try {
      await requestElementFullscreen(el);
    } catch {
      setCinemaMode(true);
    }
  };

  // Viewfinder-style corner brackets instead of a full border — reads as
  // "camera/editor framing" rather than a generic card outline.
  const bracketColor = isDark ? "border-white/35" : "border-black/35";
  const corner = `pointer-events-none absolute h-4 w-4 ${bracketColor} z-20 transition-opacity duration-300`;

  const railShellClass = `group relative aspect-[9/16] w-[200px] shrink-0 snap-center overflow-hidden rounded-2xl sm:w-[220px] ${
    isDark ? "bg-white/5" : "bg-black/5"
  }`;
  const cinemaShellClass =
    "!fixed !inset-0 !z-[200] !m-0 flex !h-dvh !w-dvw !max-w-none !shrink-0 items-center justify-center !rounded-none bg-black";

  return (
    <div
      ref={cardRef}
      onPointerEnter={onPointerEnterCard}
      onPointerLeave={onPointerLeaveCard}
      className={`${cinemaMode ? cinemaShellClass : railShellClass} fullscreen:flex fullscreen:h-dvh fullscreen:w-dvw fullscreen:max-w-none fullscreen:items-center fullscreen:justify-center fullscreen:rounded-none fullscreen:bg-black`}
    >
      <div
        className={`relative h-full w-full overflow-hidden ${
          cinemaMode
            ? "aspect-[9/16] h-[100dvh] max-h-[100dvh] w-auto max-w-[100vw] rounded-none"
            : expanded
              ? "aspect-[9/16] h-full max-h-dvh w-auto max-w-[min(100vw,calc(100dvh*9/16))] rounded-none"
              : "h-full w-full rounded-2xl"
        } fullscreen:aspect-[9/16] fullscreen:h-full fullscreen:max-h-dvh fullscreen:w-auto fullscreen:max-w-[min(100vw,calc(100dvh*9/16))] fullscreen:rounded-none`}
        onMouseEnter={handlePointerMove}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onTouchStart={isActive ? handleTouchStart : undefined}
        onTouchEnd={isActive ? handleTouchEnd : undefined}
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
                listenToPlayer(iframeRef.current);
                if (!playbackPausedRef.current) {
                  kickPlayback(iframeRef.current, mutedRef.current);
                }
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
          </div>

          <div className={`absolute right-2 top-2 z-40 flex gap-2 transition-opacity duration-300 ${topBarClass}`}>
            <button
              type="button"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={handleToggleMute}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-black/75 text-white shadow-lg backdrop-blur"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              aria-label={expanded ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={toggleFullscreen}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-black/75 text-white shadow-lg backdrop-blur"
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              aria-label="Close video"
              onClick={handleClose}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-black/45 text-white/80 shadow-lg backdrop-blur transition-colors hover:bg-black/75 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-40 h-1 bg-white/15 transition-opacity duration-300 ${controlsOpacityClass}`}
          >
            <div
              className="h-full bg-white transition-[width] duration-200 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : (
        <div
          role={playable ? "button" : undefined}
          tabIndex={playable ? 0 : undefined}
          onClick={() => {
            if (dragGuardRef?.current) {
              dragGuardRef.current = false;
              return;
            }
            if (playable) onOpen();
          }}
          onKeyDown={(e) => {
            if (!playable) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen();
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
      <div className="hidden gap-2 md:flex">
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

const CARD_STEP = 220 + 16;
const MARQUEE_SPEED_PX_PER_SEC = 72;
/** Left/right edge of the track — cursor here drives scroll direction. */
const MARQUEE_EDGE_RATIO = 0.2;
const MARQUEE_EDGE_SPEED = 0.85;
const MARQUEE_DRAG_THRESHOLD_PX = 6;

type StripId = "a" | "b";

function marqueeSlot(strip: StripId, index: number): string {
  return `${strip}-${index}`;
}

function parseMarqueeSlot(slot: string): { strip: StripId; index: number } | null {
  const match = slot.match(/^(a|b)-(\d+)$/);
  if (!match?.[1] || match[2] === undefined) return null;
  return { strip: match[1] as StripId, index: Number(match[2]) };
}

function HighlightRail({
  items,
  isDark,
  sectionTitleClass,
}: {
  items: HighlightEditItem[];
  isDark: boolean;
  sectionTitleClass?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const expandedLockRef = useRef(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [playbackPaused, setPlaybackPaused] = useState(false);

  const close = useCallback(() => {
    setActiveId(null);
    setPlaybackPaused(false);
  }, []);

  const open = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return;
    flushSync(() => {
      setMuted(true);
      setPlaybackPaused(false);
      setActiveId(index);
    });
  }, [items.length]);

  const pausePlayback = useCallback(() => setPlaybackPaused(true), []);
  const resumePlayback = useCallback(() => setPlaybackPaused(false), []);

  const scrollByCards = useCallback(
    (dir: 1 | -1) => {
      close();
      const rail = railRef.current;
      if (!rail) return;
      requestAnimationFrame(() => {
        rail.scrollBy({ left: dir * CARD_STEP, behavior: "smooth" });
      });
    },
    [close],
  );

  useEffect(() => {
    if (activeId !== null && activeId >= items.length) close();
  }, [activeId, items.length, close]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || activeId === null) return;

    let lastLeft = rail.scrollLeft;
    const onScroll = () => {
      if (expandedLockRef.current) return;
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
        data-lenis-prevent
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              touchUi
              onExpandedChange={(exp) => {
                expandedLockRef.current = exp;
              }}
              onOpen={() => open(index)}
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
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const cycleLenRef = useRef(Math.max(items.length * CARD_STEP, 1));
  const speedTargetRef = useRef(1);
  const speedRef = useRef(1);
  const hoveredRef = useRef(false);
  const dragGuardRef = useRef(false);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const slotExpandedRef = useRef<Record<string, boolean>>({});

  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [playbackPaused, setPlaybackPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const itemCount = items.length;

  useEffect(() => {
    cycleLenRef.current = Math.max(itemCount * CARD_STEP, 1);
    if (activeSlot !== null) {
      const parsed = parseMarqueeSlot(activeSlot);
      if (!parsed || parsed.index >= itemCount) {
        setActiveSlot(null);
        setPlaybackPaused(false);
      }
    }
    const cycle = cycleLenRef.current;
    if (cycle > 0) {
      offsetRef.current = ((offsetRef.current % cycle) + cycle) % cycle;
    }
  }, [itemCount, activeSlot]);

  useEffect(() => {
    if (activeSlot !== null) {
      speedTargetRef.current = 0;
      return;
    }
    if (!hoveredRef.current) speedTargetRef.current = 1;
  }, [activeSlot]);

  const wrapOffset = useCallback((next: number) => {
    const cycle = cycleLenRef.current;
    if (cycle <= 0) return 0;
    return ((next % cycle) + cycle) % cycle;
  }, []);

  const updateEdgeScrollTarget = useCallback((clientX: number) => {
    if (activeSlot !== null || draggingRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (clientX - rect.left) / rect.width;
    if (ratio < MARQUEE_EDGE_RATIO) {
      speedTargetRef.current = -MARQUEE_EDGE_SPEED;
    } else if (ratio > 1 - MARQUEE_EDGE_RATIO) {
      speedTargetRef.current = MARQUEE_EDGE_SPEED;
    } else {
      speedTargetRef.current = 0;
    }
  }, [activeSlot]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      const lerpRate = 1 - Math.pow(0.001, dt);
      speedRef.current += (speedTargetRef.current - speedRef.current) * lerpRate;

      if (!draggingRef.current && Math.abs(speedRef.current) > 0.001) {
        offsetRef.current = wrapOffset(
          offsetRef.current + MARQUEE_SPEED_PX_PER_SEC * speedRef.current * dt,
        );
      }

      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wrapOffset]);

  const nudge = useCallback((dir: 1 | -1) => {
    setActiveSlot(null);
    setPlaybackPaused(false);
    offsetRef.current = wrapOffset(offsetRef.current + dir * CARD_STEP);
  }, [wrapOffset]);

  const open = useCallback(
    (strip: StripId, index: number) => {
      if (index < 0 || index >= itemCount) return;
      flushSync(() => {
        setMuted(true);
        setPlaybackPaused(false);
        setActiveSlot(marqueeSlot(strip, index));
      });
    },
    [itemCount],
  );

  const close = useCallback(() => {
    setActiveSlot(null);
    setPlaybackPaused(false);
  }, []);

  const pausePlayback = useCallback(() => setPlaybackPaused(true), []);
  const resumePlayback = useCallback(() => setPlaybackPaused(false), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (activeSlot !== null) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      e.preventDefault();
      speedTargetRef.current = 0;
      offsetRef.current = wrapOffset(offsetRef.current + delta);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [activeSlot, wrapOffset]);

  if (itemCount === 0) return null;

  const strip = (copyKey: StripId) =>
    items.map((item, i) => {
      const slot = marqueeSlot(copyKey, i);
      const canPlay = Boolean(youtubeVideoIdFromUrl(item.href ?? ""));
      return (
        <div key={`${copyKey}-${item.href ?? item.title}-${i}`} className="shrink-0">
          <HighlightCard
            item={item}
            index={i}
            isActive={activeSlot === slot}
            isDark={isDark}
            muted={muted}
            playbackPaused={activeSlot === slot && playbackPaused}
            dragGuardRef={dragGuardRef}
            onPointerEnterCard={() => {
              if (draggingRef.current || dragGuardRef.current || !canPlay) return;
              open(copyKey, i);
            }}
            onPointerLeaveCard={() => {
              if (activeSlot === slot && !slotExpandedRef.current[slot]) close();
            }}
            onExpandedChange={(exp) => {
              slotExpandedRef.current[slot] = exp;
            }}
            onOpen={() => open(copyKey, i)}
            onClose={close}
            onPause={pausePlayback}
            onResume={resumePlayback}
            onToggleMute={() => setMuted((m) => !m)}
          />
        </div>
      );
    });

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
        ref={containerRef}
        data-lenis-prevent
        className={`relative w-full overflow-hidden py-4 select-none ${
          activeSlot ? "" : isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onMouseEnter={() => {
          hoveredRef.current = true;
          if (activeSlot === null) speedTargetRef.current = 0;
        }}
        onMouseLeave={() => {
          hoveredRef.current = false;
          draggingRef.current = false;
          setIsDragging(false);
          if (activeSlot === null) speedTargetRef.current = 1;
        }}
        onPointerDownCapture={(e) => {
          if (activeSlot !== null) return;
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest("button")) return;

          draggingRef.current = false;
          setIsDragging(false);
          dragGuardRef.current = false;
          dragStartXRef.current = e.clientX;
          dragStartOffsetRef.current = offsetRef.current;
          speedTargetRef.current = 0;
        }}
        onPointerMove={(e) => {
          if (activeSlot !== null) return;

          if (e.buttons === 1) {
            const dx = e.clientX - dragStartXRef.current;
            if (!draggingRef.current && Math.abs(dx) >= MARQUEE_DRAG_THRESHOLD_PX) {
              draggingRef.current = true;
              dragGuardRef.current = true;
              setIsDragging(true);
              close();
            }
            if (draggingRef.current) {
              offsetRef.current = wrapOffset(dragStartOffsetRef.current - dx);
            }
            return;
          }

          updateEdgeScrollTarget(e.clientX);
        }}
        onPointerDown={(e) => {
          if (activeSlot !== null) return;
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest("button")) return;
          dragStartXRef.current = e.clientX;
          dragStartOffsetRef.current = offsetRef.current;
        }}
        onPointerUp={(e) => {
          const wasDragging = draggingRef.current;
          draggingRef.current = false;
          setIsDragging(false);
          if (activeSlot === null) {
            if (wasDragging) {
              speedTargetRef.current = 0;
            } else if (hoveredRef.current) {
              updateEdgeScrollTarget(e.clientX);
            } else {
              speedTargetRef.current = 1;
            }
          }
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
          setIsDragging(false);
        }}
      >
        <div ref={trackRef} className="flex gap-4 will-change-transform">
          {strip("a")}
          {strip("b")}
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
        <HighlightRail items={visible} isDark={isDark} sectionTitleClass={sectionTitleClass} />
      )}
    </section>
  );
}
