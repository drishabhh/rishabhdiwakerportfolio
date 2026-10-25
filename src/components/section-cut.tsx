"use client";

import { AnimatePresence, motion, type TargetAndTransition, type Transition } from "framer-motion";
import { memo, useEffect, useRef, useState } from "react";

type CutKind = "flash" | "leak" | "whip";

const CUT_ORDER: CutKind[] = ["whip", "leak", "flash"];
/* One cut at most every 0.9s — well inside the "no more than 3 flashes per second" guideline. */
const MIN_GAP_MS = 900;

const CUTS: Record<CutKind, { className: string; animate: TargetAndTransition; transition: Transition }> = {
  // Hard-cut flash: a brief white pop, peaking at 18%.
  flash: {
    className: "bg-white",
    animate: { opacity: [0, 0.18, 0] },
    transition: { duration: 0.24, times: [0, 0.25, 1], ease: "easeOut" },
  },
  // Light leak: warm film burn sweeping across the frame.
  leak: {
    className:
      "bg-[radial-gradient(ellipse_55%_80%_at_20%_40%,rgba(255,140,40,0.55),transparent_70%),radial-gradient(ellipse_40%_60%_at_85%_70%,rgba(255,60,20,0.35),transparent_70%)] mix-blend-screen",
    animate: { opacity: [0, 0.85, 0], x: ["-12%", "6%", "18%"] },
    transition: { duration: 0.75, times: [0, 0.3, 1], ease: [0.22, 1, 0.36, 1] },
  },
  // Whip-pan: horizontal motion streaks racing across.
  whip: {
    className:
      "bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.10)_0px,rgba(255,255,255,0.10)_1px,transparent_1px,transparent_7px)] mix-blend-screen",
    animate: { opacity: [0, 0.9, 0], x: ["-35%", "0%", "35%"], scaleX: [1.6, 1.2, 1.6] },
    transition: { duration: 0.38, times: [0, 0.45, 1], ease: "easeInOut" },
  },
};

/** Plays a film transition (whip-pan, light leak, or flash) whenever `cutKey` changes. */
function SectionCutBase({ cutKey }: { cutKey: string }) {
  const [cut, setCut] = useState<{ id: number; kind: CutKind } | null>(null);
  const firstRef = useRef(true);
  const countRef = useRef(0);
  const lastAtRef = useRef(0);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    const now = performance.now();
    if (now - lastAtRef.current < MIN_GAP_MS) return;
    lastAtRef.current = now;
    const id = ++countRef.current;
    setCut({ id, kind: CUT_ORDER[id % CUT_ORDER.length] });
  }, [cutKey]);

  const spec = cut ? CUTS[cut.kind] : null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <AnimatePresence>
        {cut && spec ? (
          <motion.div
            key={cut.id}
            className={`absolute inset-0 ${spec.className}`}
            initial={{ opacity: 0 }}
            animate={spec.animate}
            transition={spec.transition}
            onAnimationComplete={() => setCut((current) => (current?.id === cut.id ? null : current))}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export const SectionCut = memo(SectionCutBase);
