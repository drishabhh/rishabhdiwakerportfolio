"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type HireGlide = { duration?: number; easing?: (t: number) => number; onArrive?: () => void };

type Props = {
  label: string;
  /** Optional external link; when set the button just opens it (no whip pan). */
  href?: string;
  /** Scroll to Contact with the given glide (the whip pan drives duration/easing/arrival). */
  onHire?: (glide: HireGlide) => void;
  className: string;
};

/** Whip curve: punchy launch, a long fast middle you can see streaming past, a hard brake. */
const whipEase = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const WINDUP_MS = 170; // the page pulls back before it rips down
const WHIP_TRAVEL_S = 1.35;

/**
 * "Hire me": click/tap plays a whip pan. The page winds up, then visibly rips down to
 * Contact, stretching, blurring and colour-fringing with its real speed, and slams in with
 * a squash, a camera shake and a cut-frame flash.
 */
export function HireMeButton({ label, href, onHire, className }: Props) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [whip, setWhip] = useState<{ x: number; y: number; id: number } | null>(null);
  const hydrated = useHydrated();

  const content = (
    <>
      {label} <span aria-hidden className="hire-arrow inline-block">→</span>
    </>
  );

  if (href?.trim()) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  const launch = () => {
    if (whip) return;
    const r = btnRef.current?.getBoundingClientRect();
    setWhip({
      x: r ? r.left + r.width / 2 : window.innerWidth / 2,
      y: r ? r.top + r.height / 2 : window.innerHeight / 2,
      id: Date.now(),
    });
  };

  return (
    <>
      <button ref={btnRef} type="button" className={className} onClick={launch}>
        {content}
      </button>
      {hydrated
        ? createPortal(
            <AnimatePresence>
              {whip ? (
                <WhipPan
                  key={whip.id}
                  originX={whip.x}
                  originY={whip.y}
                  onLaunch={(onArrive) => onHire?.({ duration: WHIP_TRAVEL_S, easing: whipEase, onArrive })}
                  onDone={() => setWhip(null)}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

/* ───────────────────────── whip pan ───────────────────────── */

/** Page layers that scroll (everything in <main> that isn't pinned to the screen). */
function scrollingLayers(): HTMLElement[] {
  const main = document.querySelector("main");
  if (!main) return [];
  return Array.from(main.children).filter((el): el is HTMLElement => {
    if (!(el instanceof HTMLElement)) return false;
    const pos = getComputedStyle(el).position;
    return pos !== "fixed" && pos !== "sticky" && el.offsetHeight > 0;
  });
}

function resetLayer(el: HTMLElement) {
  el.style.animation = "";
  el.style.transform = "";
  el.style.transformOrigin = "";
  el.style.transition = "";
  el.style.willChange = "";
}

function WhipPan({
  originX,
  originY,
  onLaunch,
  onDone,
}: {
  originX: number;
  originY: number;
  onLaunch: (onArrive: () => void) => void;
  onDone: () => void;
}) {
  const fxRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"windup" | "whip" | "land">("windup");

  useEffect(() => {
    const layers = scrollingLayers();
    const fx = fxRef.current;
    const tops = layers.map((el) => el.getBoundingClientRect().top + window.scrollY);
    const timers: number[] = [];
    let raf = 0;
    let landed = false;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let smooth = 0;

    /* inline styles only: React re-renders these sections' classNames mid-effect */
    layers.forEach((el) => {
      el.style.willChange = "transform";
    });

    /* 1 ── wind-up: the page pulls back like a camera bracing for the pan */
    layers.forEach((el) => {
      el.style.transition = `transform ${WINDUP_MS}ms cubic-bezier(0.3, 0, 0.2, 1)`;
      el.style.transform = "translate3d(0, 22px, 0) scaleY(0.985)";
    });

    /* 2 ── whip: stretch / blur / fringe follow the real scroll speed every frame */
    const tick = (now: number) => {
      const y = window.scrollY;
      const dt = Math.max(1, now - lastT);
      const v = ((y - lastY) / dt) * 16.7; // px per 60fps frame
      lastY = y;
      lastT = now;
      smooth += (Math.abs(v) - smooth) * 0.35;
      const vh = window.innerHeight;
      const k = Math.min(1, smooth / (vh * 0.22)); // 0..1 intensity
      const stretch = 1 + k * 0.32;
      const dir = v >= 0 ? 1 : -1;
      layers.forEach((el, i) => {
        const originY = y + vh / 2 - tops[i]!;
        el.style.transformOrigin = `50% ${originY}px`;
        el.style.transform = `translate3d(0, ${-dir * k * 18}px, 0) scaleY(${stretch})`;
      });
      if (fx) {
        fx.style.setProperty("--k", k.toFixed(3));
        fx.style.setProperty("--blur", `${(k * 9).toFixed(2)}px`);
      }
      raf = requestAnimationFrame(tick);
    };

    const land = () => {
      if (landed) return;
      landed = true;
      cancelAnimationFrame(raf);
      setPhase("land");
      fx?.style.setProperty("--k", "0");
      fx?.style.setProperty("--blur", "0px");
      /* 3 ── impact: squash, bounce and shake, then hand the page back untouched */
      layers.forEach((el) => {
        el.style.transition = "none";
        el.style.transform = "";
        el.style.transformOrigin = `50% ${window.scrollY + window.innerHeight / 2 - (el.getBoundingClientRect().top + window.scrollY)}px`;
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "whip-impact 0.68s cubic-bezier(0.2, 0.9, 0.25, 1) both";
      });
      const target = document.getElementById("colophon");
      if (target) {
        target.classList.remove("hire-landed");
        void target.offsetWidth;
        target.classList.add("hire-landed");
        timers.push(window.setTimeout(() => target.classList.remove("hire-landed"), 1800));
      }
      timers.push(
        window.setTimeout(() => {
          layers.forEach(resetLayer);
          onDone();
        }, 720),
      );
    };

    timers.push(
      window.setTimeout(() => {
        setPhase("whip");
        layers.forEach((el) => {
          el.style.transition = "none";
        });
        lastY = window.scrollY;
        lastT = performance.now();
        raf = requestAnimationFrame(tick);
        onLaunch(land);
      }, WINDUP_MS),
    );
    /* safety: if the visitor grabs the scroll mid-pan, still land cleanly */
    timers.push(window.setTimeout(land, WINDUP_MS + WHIP_TRAVEL_S * 1000 + 600));

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      layers.forEach(resetLayer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      ref={fxRef}
      className={`whip-fx pointer-events-none fixed inset-0 z-[320] is-${phase}`}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      aria-hidden
    >
      <div className="whip-blur absolute inset-0" />
      <div className="whip-streaks absolute inset-0" />
      <div className="whip-fringe absolute inset-0" />
      <div className="whip-vignette absolute inset-0" />

      {/* click: a tight orange pulse from the button */}
      <span className="whip-tap" style={{ left: originX, top: originY }} />

      {phase === "land" ? (
        <>
          <span className="whip-cut absolute inset-0" />
          <span className="whip-scan" />
        </>
      ) : null}
    </motion.div>
  );
}
