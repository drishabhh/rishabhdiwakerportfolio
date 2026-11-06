"use client";

import { HeroReelViewer, originFromElement, type HeroReel, type ReelOrigin } from "@/components/hero-reel-viewer";
import { useHydrated } from "@/hooks/use-hydrated";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { Eye, Hand, Heart, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const cinematicEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Hover this long before a reel starts playing (a ring fills on the play icon meanwhile). */
const HOVER_DWELL_MS = 2000;

type Slot = { left: number; top: number; rotate: number; depth: number; bob: number; lift?: number };

/** Collage slots inside the right-hand cluster (percent of the cluster box). */
const CLUSTER_SLOTS: Slot[] = [
  { left: 0, top: 6, rotate: -9, depth: 26, bob: 4.4 },
  { left: 52, top: 0, rotate: 13, depth: 14, bob: 5.2 },
  { left: 4, top: 50, rotate: 8, depth: 18, bob: 4.8 },
  { left: 55, top: 48, rotate: -11, depth: 30, bob: 5.6 },
];

/** Fanned "hand of reels" used on phones and tablets (lift = px pushed down at the ends). */
const ROW_SLOTS: Slot[] = [
  { left: 0, top: 0, rotate: -9, depth: 0, bob: 4.4, lift: 10 },
  { left: 0, top: 0, rotate: -3, depth: 0, bob: 5.2, lift: 0 },
  { left: 0, top: 0, rotate: 4, depth: 0, bob: 4.8, lift: 0 },
  { left: 0, top: 0, rotate: 10, depth: 0, bob: 5.6, lift: 10 },
];

export type HeroFloatingReelsProps = {
  items: HeroReel[];
  badges: string[];
  /** "cluster" = floating collage beside the headline (laptop/desktop). "row" = fanned row (phone/tablet). */
  layout?: "cluster" | "row";
  /** Hint under the desktop cluster; empty hides it. */
  hint?: string;
};

type Active = { index: number; mode: "preview" | "modal"; origin: ReelOrigin };

/** True only on devices with a real mouse/trackpad (not touch). */
function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return fine;
}

/**
 * Four floating reels. Desktop: hover a tile and it grows into a bigger frame
 * that plays the clip (move away to shrink it back); click for the full player.
 * Tiles can still be dragged and thrown. Phone/tablet: a fanned row; tap a reel
 * to open the full player. Videos always play on the site, never redirect.
 */
export function HeroFloatingReels({ items, badges, layout = "cluster", hint = "Hover to play" }: HeroFloatingReelsProps) {
  const reduced = useReducedMotionSafe();
  const finePointer = useFinePointer();
  const tiles = items.slice(0, 4);
  const isRow = layout === "row";

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18 });
  const sy = useSpring(py, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (reduced || isRow || !finePointer) return;
    const onMove = (e: PointerEvent) => {
      px.set(e.clientX / window.innerWidth - 0.5);
      py.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [px, py, reduced, isRow, finePointer]);

  const [front, setFront] = useState<number | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  /** Tile hidden while its frame is open or flying back. */
  const [lifted, setLifted] = useState<number | null>(null);
  const [exitOrigin, setExitOrigin] = useState<ReelOrigin | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mounted = useHydrated();

  const slots = isRow ? ROW_SLOTS : CLUSTER_SLOTS;

  const activeRef = useRef<Active | null>(null);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const open = (index: number, mode: Active["mode"]) => {
    const current = activeRef.current;
    const origin =
      current && current.index === index
        ? current.origin
        : originFromElement(cardRefs.current[index] ?? null, slots[index]?.rotate ?? 0);
    setActive({ index, mode, origin });
    setLifted(index);
  };


  const close = () => {
    const current = activeRef.current;
    if (current) {
      setExitOrigin(originFromElement(cardRefs.current[current.index] ?? null, slots[current.index]?.rotate ?? 0));
    }
    setActive(null);
  };

  if (tiles.length === 0) return null;

  const hidden = isRow ? { opacity: 0, y: 40 } : { opacity: 0, x: 60 };
  const shown = isRow ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 };
  const activeReel = active ? tiles[active.index] : null;

  return (
    <>
      <motion.div
        initial={reduced ? { opacity: 0 } : hidden}
        animate={shown}
        transition={reduced ? { duration: 0.25 } : { duration: 0.9, delay: 0.6, ease: cinematicEase }}
        className={isRow ? "relative flex w-full items-end justify-center gap-[2.6vw] md:gap-6" : "relative h-full w-full"}
      >
        {tiles.map((item, i) => (
          <FloatingTile
            key={`${item.href ?? item.fileUrl ?? item.title}-${i}`}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            item={item}
            index={i}
            slot={slots[i]!}
            layout={layout}
            badge={isRow ? undefined : i === 0 ? badges[0] : i === 3 ? badges[1] : undefined}
            badgeIcon={i === 0 ? "heart" : "eye"}
            px={sx}
            py={sy}
            isFront={front === i}
            onFront={() => setFront(i)}
            finePointer={finePointer}
            lifted={lifted === i}
            previewOpen={active?.index === i}
            onPreview={() => open(i, "preview")}
            onOpen={() => open(i, "modal")}
          />
        ))}

        {isRow || !hint.trim() ? null : (
          <span className="pointer-events-none absolute -bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
            <Hand className="h-3 w-3 text-orange-400" aria-hidden />
            {hint}
          </span>
        )}
      </motion.div>

      {mounted
        ? createPortal(
            <AnimatePresence custom={exitOrigin} onExitComplete={() => setLifted(null)}>
              {active && activeReel ? (
                <HeroReelViewer
                  key={`viewer-${active.index}`}
                  reel={activeReel}
                  mode={active.mode}
                  origin={active.origin}
                  onClose={close}
                  onExpand={() => open(active.index, "modal")}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

type FloatingTileProps = {
  ref: (el: HTMLDivElement | null) => void;
  item: HeroReel;
  index: number;
  slot: Slot;
  layout: "cluster" | "row";
  badge?: string;
  badgeIcon: "heart" | "eye";
  px: MotionValue<number>;
  py: MotionValue<number>;
  isFront: boolean;
  onFront: () => void;
  finePointer: boolean;
  lifted: boolean;
  previewOpen: boolean;
  onPreview: () => void;
  onOpen: () => void;
};

function FloatingTile({
  ref,
  item,
  index,
  slot,
  layout,
  badge,
  badgeIcon,
  px,
  py,
  isFront,
  onFront,
  finePointer,
  lifted,
  previewOpen,
  onPreview,
  onOpen,
}: FloatingTileProps) {
  const isRow = layout === "row";
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragged = useRef(false);
  const pressed = useRef(false);
  const dwell = useRef(0);
  const [hover, setHover] = useState(false);
  /** True while the 2s hover countdown runs (drives the filling ring). */
  const [charging, setCharging] = useState(false);

  /* cursor parallax per depth (cluster only) */
  const parX = useTransform(px, (v) => v * slot.depth * 2.2);
  const parY = useTransform(py, (v) => v * slot.depth * 1.6);

  /* 3D tilt + glare under the pointer */
  const tiltX = useSpring(0, { stiffness: 200, damping: 18 });
  const tiltY = useSpring(0, { stiffness: 200, damping: 18 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glare = useTransform(
    [glareX, glareY],
    ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.45), rgba(255,255,255,0) 55%)`,
  );

  /* spin a little while being thrown */
  const dragX = useMotionValue(0);
  const spin = useTransform(dragX, [-260, 0, 260], [-18, 0, 18]);

  /* Drag only with a mouse: on touch screens a drag would hijack page scrolling. */
  const canDrag = finePointer;

  useEffect(() => () => window.clearTimeout(dwell.current), []);

  const cancelDwell = () => {
    window.clearTimeout(dwell.current);
    setCharging(false);
  };

  const BadgeIcon = badgeIcon === "heart" ? Heart : Eye;
  const fileOnly = !item.thumbnail && Boolean(item.fileUrl?.trim());

  return (
    <motion.div
      className={isRow ? "relative w-[min(20vw,10.5vh)] shrink-0 md:w-[min(17vw,13vh)]" : "absolute w-[42%]"}
      style={
        isRow
          ? { marginBottom: -(slot.lift ?? 0), zIndex: isFront || hover ? 30 : 10 + index }
          : {
              left: `${slot.left}%`,
              top: `${slot.top}%`,
              x: parX,
              y: parY,
              zIndex: isFront || hover ? 30 : 10 + index,
            }
      }
    >
      <span
        className="hero-float-shadow"
        style={{ animationDuration: `${slot.bob}s`, animationDelay: `${index * -1.1}s`, opacity: lifted ? 0 : undefined }}
        aria-hidden
      />
      <div
        className="hero-float-bob relative"
        style={{ animationDuration: `${slot.bob}s`, animationDelay: `${index * -1.1}s` }}
      >
        <div
          className="hero-float-sway relative"
          style={{ animationDuration: `${(slot.bob * 1.7).toFixed(2)}s`, animationDelay: `${index * -2.3}s` }}
        >
          <motion.div
            role="button"
            tabIndex={0}
            aria-label={item.title ? `Play ${item.title}` : "Play video"}
            drag={canDrag}
            dragSnapToOrigin
            dragElastic={0.55}
            dragTransition={{ bounceStiffness: 260, bounceDamping: 14 }}
            whileDrag={{ scale: 1.1, cursor: "grabbing" }}
            whileTap={canDrag ? undefined : { scale: 0.94 }}
            onPointerDown={() => {
              pressed.current = true;
              cancelDwell();
            }}
            onPointerUp={() => {
              pressed.current = false;
            }}
            onDragStart={() => {
              dragged.current = true;
              cancelDwell();
              onFront();
            }}
            onDragEnd={() => {
              window.setTimeout(() => (dragged.current = false), 60);
            }}
            onClick={() => {
              if (dragged.current) return;
              cancelDwell();
              onOpen();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }}
            onPointerEnter={(e) => {
              if (e.pointerType !== "mouse") return;
              setHover(true);
              onFront();
              cancelDwell();
              setCharging(true);
              dwell.current = window.setTimeout(() => {
                setCharging(false);
                if (!pressed.current && !dragged.current) onPreview();
              }, HOVER_DWELL_MS);
            }}
            onPointerLeave={() => {
              setHover(false);
              tiltX.set(0);
              tiltY.set(0);
              if (!previewOpen) cancelDwell();
            }}
            onPointerMove={(e) => {
              if (e.pointerType !== "mouse") return;
              const r = cardRef.current?.getBoundingClientRect();
              if (!r) return;
              const nx = (e.clientX - r.left) / r.width;
              const ny = (e.clientY - r.top) / r.height;
              tiltY.set((nx - 0.5) * 22);
              tiltX.set((0.5 - ny) * 22);
              glareX.set(nx * 100);
              glareY.set(ny * 100);
            }}
            className={`pointer-events-auto block select-none outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
              canDrag ? "cursor-pointer touch-none" : "touch-pan-y"
            }`}
            style={{ x: dragX, rotate: spin, opacity: lifted ? 0 : 1 }}
          >
            <motion.div
              ref={(el) => {
                cardRef.current = el;
                ref(el);
              }}
              animate={{ rotate: hover ? 0 : slot.rotate, scale: hover ? 1.08 : 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 20 }}
              style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 900 }}
              className={`relative aspect-[9/14] overflow-hidden bg-zinc-900 ${
                isRow
                  ? "rounded-[12px] border-[3px] border-white/90 shadow-[0_18px_40px_rgba(0,0,0,0.6)] md:rounded-[16px] md:border-[4px]"
                  : "rounded-[18px] border-[4px] border-white/90 shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
              }`}
            >
              {fileOnly ? (
                <video
                  src={`${item.fileUrl}#t=0.5`}
                  muted
                  playsInline
                  preload="metadata"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                />
              ) : item.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnail}
                  alt={item.title || "Reel"}
                  draggable={false}
                  decoding="async"
                  className={`pointer-events-none absolute inset-0 h-full w-full scale-[1.34] object-cover transition-transform duration-[1400ms] ease-out ${hover ? "scale-[1.48]" : ""}`}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/70 via-fuchsia-600/60 to-indigo-700/70" />
              )}
              <motion.div className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ background: glare }} />
              <span
                className={`pointer-events-none absolute flex items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/40 backdrop-blur transition-transform duration-300 ${
                  isRow ? "bottom-1.5 right-1.5 h-5 w-5 md:bottom-2 md:right-2 md:h-6 md:w-6" : "bottom-2.5 right-2.5 h-7 w-7"
                } ${charging ? "scale-[1.35]" : ""}`}
              >
                {!isRow ? (
                  /* fills over the 2s hover; the clip plays when it closes */
                  <svg className="absolute -inset-[3px] h-[calc(100%+6px)] w-[calc(100%+6px)] -rotate-90" viewBox="0 0 36 36" aria-hidden>
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke="#fb923c"
                      strokeWidth="3"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray="100"
                      style={{
                        strokeDashoffset: charging ? 0 : 100,
                        transition: charging ? `stroke-dashoffset ${HOVER_DWELL_MS}ms linear` : "stroke-dashoffset 150ms ease-out",
                      }}
                    />
                  </svg>
                ) : null}
                <Play className={`translate-x-[0.5px] fill-current ${isRow ? "h-2.5 w-2.5 md:h-3 md:w-3" : "h-3 w-3"}`} aria-hidden />
              </span>
            </motion.div>
          </motion.div>
          {badge ? (
            <span
              className={`pointer-events-none absolute z-40 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-orange-500 shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition-opacity ${
                index === 0 ? "-left-8 top-[14%] -rotate-6" : "-right-6 bottom-[16%] rotate-3"
              } ${lifted ? "opacity-0" : ""}`}
            >
              <BadgeIcon className="h-3.5 w-3.5" aria-hidden />
              {badge}
            </span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
