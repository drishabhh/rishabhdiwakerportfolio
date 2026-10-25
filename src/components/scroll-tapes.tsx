"use client";

import { scrollVelocity } from "@/lib/scroll-velocity";
import { motion, useAnimationFrame, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

/** Copies of the word list on each tape; the track loops by one copy (100% / COPIES). */
const COPIES = 4;

const wrap = (min: number, max: number, value: number) => {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
};

type TapeProps = {
  words: readonly string[];
  /** Drift speed at rest, in % of the track per second; the sign sets the resting direction. */
  baseSpeed: number;
  tone: "film" | "orange";
  rotate: number;
};

function Tape({ words, baseSpeed, tone, rotate }: TapeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "200px 0px" });
  const offset = useMotionValue(0);
  const direction = useRef(1);
  /* Scrolling speeds the tape up and leans it with the momentum. */
  const boost = useSpring(
    useTransform(scrollVelocity, (v) => Math.min(7, Math.abs(v) / 6)),
    { stiffness: 300, damping: 40 },
  );
  const skew = useSpring(
    useTransform(scrollVelocity, (v) => Math.max(-12, Math.min(12, -v * 0.3))),
    { stiffness: 300, damping: 30 },
  );
  const x = useTransform(offset, (v) => `${wrap(-200 / COPIES, -100 / COPIES, v)}%`);

  useAnimationFrame((_, delta) => {
    if (!inView) return;
    const v = scrollVelocity.get();
    // Scrolling back up runs the tape backwards.
    if (v < -0.5) direction.current = -1;
    else if (v > 0.5) direction.current = 1;
    offset.set(offset.get() + direction.current * baseSpeed * (delta / 1000) * (1 + boost.get()));
  });

  const film = tone === "film";

  return (
    <div
      ref={ref}
      className={`relative -ml-[10vw] w-[120vw] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)] ${
        film
          ? "border-y border-white/10 bg-[#0b0b0d] text-white"
          : "bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600 text-zinc-950 shadow-[0_0_60px_-10px_rgba(255,122,40,0.55)]"
      }`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {film ? <Sprockets /> : null}
      <motion.div className="flex w-max whitespace-nowrap py-2.5 md:py-3.5" style={{ x, skewX: skew }}>
        {Array.from({ length: COPIES }, (_, copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {words.map((word, i) => (
              <span key={`${copy}-${i}`} className="flex items-center">
                <span
                  className={`px-4 font-[family-name:var(--font-syne)] text-xl font-extrabold uppercase leading-none tracking-tight md:px-7 md:text-4xl ${
                    film
                      ? i % 2 === 0
                        ? "text-white"
                        : "text-transparent [-webkit-text-stroke:1.2px_rgb(251,146,60)] [filter:drop-shadow(0_0_8px_rgba(251,146,60,0.55))]"
                      : ""
                  }`}
                >
                  {word}
                </span>
                <span className={film ? "text-orange-400 [text-shadow:0_0_10px_rgba(251,146,60,0.8)]" : "text-zinc-950/70"}>
                  {film ? "✦" : "●"}
                </span>
              </span>
            ))}
          </div>
        ))}
      </motion.div>
      {film ? <Sprockets /> : null}
    </div>
  );
}

function Sprockets() {
  return (
    <div className="h-2 px-1 py-[2px]">
      <div className="h-full bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.16)_0_10px,transparent_10px_22px)]" />
    </div>
  );
}

type ScrollTapesProps = {
  front: readonly string[];
  back: readonly string[];
};

/**
 * Two crossing tapes — a black film strip and an orange band — that drift on their own and are
 * driven by the scroll: faster as you scroll faster, reversed when you scroll up, leaning with
 * the momentum. Decorative only.
 */
export function ScrollTapes({ front, back }: ScrollTapesProps) {
  return (
    <div aria-hidden className="pointer-events-none relative z-20 h-40 overflow-x-clip md:h-56">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
        <Tape tone="orange" words={back} baseSpeed={1.2} rotate={2.5} />
      </div>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
        <Tape tone="film" words={front} baseSpeed={-1.6} rotate={-3} />
      </div>
    </div>
  );
}
