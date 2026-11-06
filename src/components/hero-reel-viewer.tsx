"use client";

import { SOUND_TOGGLE_ATTR, canPlayWithSound, useSoundUnlock } from "@/lib/sound-policy";
import { canToggleSound, embedSrc, videoSourceFrom, type VideoSource } from "@/lib/video-source";
import { motion, useDragControls, type PanInfo } from "framer-motion";
import { useLenis } from "lenis/react";
import { Maximize2, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type HeroReel = {
  title: string;
  href?: string;
  fileUrl?: string;
  /** Poster image; empty for uploaded files (first frame is used). */
  thumbnail: string;
};

export type ReelOrigin = { left: number; top: number; width: number; height: number; rotate: number };

export function originFromElement(el: HTMLElement | null, rotate = 0): ReelOrigin {
  const r = el?.getBoundingClientRect();
  if (!r) {
    const w = typeof window === "undefined" ? 0 : window.innerWidth;
    const h = typeof window === "undefined" ? 0 : window.innerHeight;
    return { left: w / 2 - 60, top: h / 2 - 90, width: 120, height: 180, rotate: 0 };
  }
  return { left: r.left, top: r.top, width: r.width, height: r.height, rotate };
}

const spring = { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.9 };

/** Geometry the frame grows into. Preview = a bigger floating frame near the tile; modal = centered player. */
function useTarget(mode: "preview" | "modal", origin: ReelOrigin) {
  const [vp, setVp] = useState(() =>
    typeof window === "undefined" ? { w: 1280, h: 800 } : { w: window.innerWidth, h: window.innerHeight },
  );
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (mode === "modal") {
    const headerSpace = 56;
    const maxH = vp.h * 0.86 - headerSpace;
    let height = Math.min(maxH, 820);
    let width = (height * 9) / 16;
    const maxW = Math.min(vp.w * 0.92, 520);
    if (width > maxW) {
      width = maxW;
      height = (width * 16) / 9;
    }
    return {
      left: (vp.w - width) / 2,
      top: (vp.h - height + headerSpace) / 2,
      width,
      height,
      rotate: 0,
    };
  }

  const height = Math.min(vp.h * 0.66, 580);
  const width = (height * 9) / 16;
  const cx = origin.left + origin.width / 2;
  const cy = origin.top + origin.height / 2;
  const left = Math.min(Math.max(cx - width / 2, 16), vp.w - width - 16);
  const top = Math.min(Math.max(cy - height / 2, 72), vp.h - height - 110);
  return { left, top: Math.max(top, 16), width, height, rotate: 0 };
}

type ViewerProps = {
  reel: HeroReel;
  mode: "preview" | "modal";
  origin: ReelOrigin;
  onClose: () => void;
  onExpand: () => void;
};

/**
 * The reel grows out of its tile and plays right here on the site.
 * Desktop hover: a bigger muted frame (sound + full-size buttons); moving the
 * mouse away shrinks it back. Click or tap: a centered player with sound and
 * controls; close with ✕, Esc, a tap outside, swipe down, or the back button.
 */
export function HeroReelViewer({ reel, mode, origin, onClose, onExpand }: ViewerProps) {
  const source = videoSourceFrom(reel.href, reel.fileUrl);
  const target = useTarget(mode, origin);
  const isModal = mode === "modal";
  const lenis = useLenis();
  const pushedRef = useRef(false);
  /* Videos play WITH sound. The only exception is the browser rule that sound needs one
     click/tap on the page first: then the hover preview starts muted and the sound comes on
     at the visitor's first click/tap. The full player is always opened by a click/tap. */
  const [allowedAtOpen] = useState(canPlayWithSound);
  const [autoMuted, setAutoMuted] = useState(false);
  const [soundChoice, setSoundChoice] = useState<{ mode: "preview" | "modal"; on: boolean } | null>(null);
  const userChose = Boolean(soundChoice && soundChoice.mode === mode);
  const muted = userChose ? !soundChoice!.on : (!isModal && !allowedAtOpen) || autoMuted;
  const setMuted = (next: boolean) => {
    setAutoMuted(false);
    setSoundChoice({ mode, on: !next });
  };
  useSoundUnlock(muted && !userChose, () => setMuted(false));
  const dragControls = useDragControls();

  /* Modal: freeze page scroll and make the phone/browser back button close it. */
  const requestClose = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
      return;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isModal) return;
    lenis?.stop();
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    window.history.pushState({ ...(window.history.state ?? {}), heroReel: true }, "");
    pushedRef.current = true;
    const onPop = () => {
      if (!pushedRef.current) {
        onClose();
        return;
      }
      pushedRef.current = false;
      onClose();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      html.style.overflow = prevOverflow;
      lenis?.start();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") (isModal ? requestClose : onClose)();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModal, onClose, requestClose]);

  const onHeaderDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 600) requestClose();
  };

  return (
    <>
      {isModal ? (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={requestClose}
          data-lenis-prevent
        />
      ) : null}

      <motion.div
        key="frame"
        role={isModal ? "dialog" : undefined}
        aria-modal={isModal || undefined}
        aria-label={reel.title || "Video"}
        custom={origin}
        variants={{
          from: (o: ReelOrigin) => ({ ...o, opacity: 1, borderRadius: 18 }),
          to: { ...target, opacity: 1, borderRadius: isModal ? 22 : 24 },
        }}
        initial="from"
        animate="to"
        exit="from"
        transition={spring}
        drag={isModal ? "y" : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={onHeaderDragEnd}
        onPointerLeave={(e) => {
          if (!isModal && e.pointerType === "mouse") onClose();
        }}
        className={`fixed overflow-visible ${isModal ? "z-[201]" : "z-[90]"}`}
        data-lenis-prevent
      >
        {isModal ? (
          <motion.div
            className="absolute -top-14 left-0 right-0 h-14 cursor-grab touch-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(e) => dragControls.start(e)}
            aria-hidden
          >
            <span className="absolute left-1/2 top-1 h-1 w-10 -translate-x-1/2 rounded-full bg-white/45 md:hidden" />
          </motion.div>
        ) : null}

        <div
          className={`relative h-full w-full overflow-hidden bg-black ${
            isModal
              ? "rounded-[22px] shadow-[0_40px_120px_rgba(0,0,0,0.7)] ring-1 ring-white/15"
              : "rounded-[24px] border-[4px] border-white/90 shadow-[0_40px_100px_rgba(0,0,0,0.65)]"
          }`}
        >
          {source ? (
            <ReelMedia
              source={source}
              poster={reel.thumbnail}
              muted={muted}
              controls={isModal}
              onAutoMuted={() => setAutoMuted(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/70">
              This video has no playable link yet.
            </div>
          )}

          {!isModal ? (
            <button
              type="button"
              aria-label="Open full player"
              onClick={onExpand}
              className="absolute inset-0 z-10 cursor-pointer bg-transparent"
            />
          ) : null}

          {!isModal ? (
            <span className="pointer-events-none absolute bottom-3 left-3 right-14 z-20 truncate text-[12px] font-semibold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
              {reel.title}
            </span>
          ) : null}
        </div>

        {/* controls */}
        <div
          className={`absolute z-30 flex gap-2 ${isModal ? "-top-12 right-0" : "right-3 top-3"}`}
        >
          {!isModal && source && canToggleSound(source) ? (
            <button
              type="button"
              aria-label={muted ? "Turn sound on" : "Mute"}
              {...{ [SOUND_TOGGLE_ATTR]: "" }}
              onClick={(e) => {
                e.stopPropagation();
                setMuted(!muted);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-black/80"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          ) : null}
          {!isModal ? (
            <button
              type="button"
              aria-label="Open full player"
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-black/80"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Close video"
              onClick={requestClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg transition hover:scale-105"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {isModal ? (
          <motion.p
            className="pointer-events-none absolute -top-11 left-0 right-14 truncate pt-2 text-sm font-semibold text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {reel.title}
          </motion.p>
        ) : null}
      </motion.div>
    </>
  );
}

/** Plays a file in <video> or an embed in an iframe; sound follows `muted` where the platform allows it. */
function ReelMedia({
  source,
  poster,
  muted,
  controls,
  onAutoMuted,
}: {
  source: VideoSource;
  poster: string;
  muted: boolean;
  controls: boolean;
  onAutoMuted: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const mutedRef = useRef(muted);
  const timers = useRef<number[]>([]);

  /* Tell an embedded player to match our sound state. */
  const syncEmbedSound = useCallback(() => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    const m = mutedRef.current;
    if (source.kind === "youtube") {
      win.postMessage(JSON.stringify({ event: "listening" }), "*");
      win.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
      win.postMessage(JSON.stringify({ event: "command", func: m ? "mute" : "unMute", args: [] }), "*");
      if (!m) win.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [100] }), "*");
    } else if (source.kind === "vimeo") {
      win.postMessage(JSON.stringify({ method: "setMuted", value: m }), "*");
      win.postMessage(JSON.stringify({ method: "setVolume", value: m ? 0 : 1 }), "*");
      win.postMessage(JSON.stringify({ method: "play" }), "*");
    }
  }, [source.kind]);

  useEffect(() => {
    mutedRef.current = muted;
    const v = videoRef.current;
    if (v) {
      v.muted = muted;
      void v.play().catch(() => {
        if (!v.muted) {
          /* Browser refused sound before any click/tap: keep playing muted for now. */
          v.muted = true;
          onAutoMuted();
          void v.play().catch(() => {});
        }
      });
      return;
    }
    syncEmbedSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, syncEmbedSound]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /* Embeds start muted (always allowed to autoplay), then switch the sound on once the
     player is ready; a few retries because players load at different speeds. */
  const onFrameLoad = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [250, 800, 1600, 3000].map((ms) => window.setTimeout(syncEmbedSound, ms));
  };

  if (source.kind === "file") {
    return (
      <video
        ref={videoRef}
        src={source.src}
        poster={poster || undefined}
        autoPlay
        loop
        playsInline
        muted={muted}
        controls={controls}
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  const startMuted = source.kind === "youtube" || source.kind === "vimeo";
  const src = embedSrc(source, { muted: startMuted, controls });
  return (
    <>
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-sm" />
      ) : null}
      <iframe
        ref={frameRef}
        src={src ?? undefined}
        onLoad={onFrameLoad}
        title="Video player"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className={
          /* Without controls, a wide player is cropped to fill the vertical frame (vertical
             reels still fit exactly); with controls the whole player stays visible. */
          source.kind === "instagram" || controls
            ? "absolute inset-0 h-full w-full bg-black"
            : "absolute left-1/2 top-0 h-full w-[316%] -translate-x-1/2 bg-black"
        }
      />
    </>
  );
}
