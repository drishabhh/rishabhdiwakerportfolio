"use client";

import { useSyncExternalStore } from "react";

/** "full" runs every effect; "lite" swaps the WebGL hero for the CSS photo layer. */
export type PerfTier = "full" | "lite";

const STORAGE_KEY = "perf-tier";
const WINDOW_FRAMES = 120;
const LATE_FRAME_MS = 24;

let tier: PerfTier = "full";
let started = false;
const listeners = new Set<() => void>();

function setTier(next: PerfTier) {
  if (tier === next) return;
  tier = next;
  document.documentElement.dataset.perf = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, next);
  } catch {}
  listeners.forEach((listener) => listener());
}

/**
 * Watches real frame pacing and drops to "lite" when frames keep running late (two 2-second
 * windows in a row). It never climbs back within a session, so effects don't flap.
 */
function startGovernor() {
  if (started || typeof window === "undefined") return;
  started = true;

  // Preview override: ?fx=full keeps every effect on this machine, ?fx=lite forces the fallback.
  const forced = new URLSearchParams(window.location.search).get("fx");
  if (forced === "full") return;
  if (forced === "lite") {
    setTier("lite");
    return;
  }

  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "lite") {
      setTier("lite");
      return;
    }
  } catch {}

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if ((nav.deviceMemory ?? 8) <= 2 || nav.connection?.saveData) {
    setTier("lite");
    return;
  }

  let last = 0;
  let frames: number[] = [];
  let strikes = 0;
  let warmupEnds = Infinity;

  // Page load (hydration, image decodes, shader compile) isn't representative — start
  // judging 2.5s after the load event.
  const startClock = () => (warmupEnds = performance.now() + 2500);
  if (document.readyState === "complete") startClock();
  else window.addEventListener("load", startClock, { once: true });

  const tick = (now: number) => {
    if (now < warmupEnds) {
      last = now;
      requestAnimationFrame(tick);
      return;
    }
    const dt = now - last;
    last = now;
    // Skip the gap after a hidden tab or a stalled load; it says nothing about rendering cost.
    if (dt > 0 && dt < 250 && document.visibilityState === "visible") frames.push(dt);

    if (frames.length >= WINDOW_FRAMES) {
      const sorted = [...frames].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const lateShare = frames.filter((d) => d > LATE_FRAME_MS).length / frames.length;
      frames = [];
      strikes = lateShare > 0.15 || median > 20 ? strikes + 1 : 0;
      if (strikes >= 2) {
        setTier("lite");
        return;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  startGovernor();
  return () => listeners.delete(listener);
};

/** Current tier; "full" in the server markup and during hydration. */
export function usePerfTier(): PerfTier {
  return useSyncExternalStore(subscribe, () => tier, () => "full");
}
