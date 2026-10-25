export const cinematicEase = (t: number): number => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const p1 = 0.22;
  const p2 = 1;
  const p3 = 0.36;
  const p4 = 1;
  let start = 0;
  let end = 1;
  for (let i = 0; i < 12; i += 1) {
    const mid = (start + end) / 2;
    const x = 3 * p1 * mid * (1 - mid) * (1 - mid) + 3 * p3 * mid * mid * (1 - mid) + mid * mid * mid;
    if (x < t) start = mid;
    else end = mid;
  }
  const u = (start + end) / 2;
  return 3 * p2 * u * (1 - u) * (1 - u) + 3 * p4 * u * u * (1 - u) + u * u * u;
};

/** Glide length in seconds: short hops stay quick, long jumps never drag (0.7s–1.5s). */
export function navScrollDuration(distancePx: number): number {
  const viewports = Math.abs(distancePx) / Math.max(1, window.innerHeight);
  return Math.min(1.5, Math.max(0.7, 0.5 + 0.3 * Math.sqrt(viewports)));
}

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

/**
 * Calls `onIntent` once when the user takes over scrolling (wheel, touch, a press such as
 * scrubbing the timeline, or scroll keys).
 */
export function onUserScrollIntent(onIntent: () => void): () => void {
  const fire = () => {
    stop();
    onIntent();
  };
  const onKey = (event: KeyboardEvent) => {
    if (SCROLL_KEYS.has(event.key)) fire();
  };
  const stop = () => {
    window.removeEventListener("wheel", fire);
    window.removeEventListener("touchstart", fire);
    window.removeEventListener("pointerdown", fire);
    window.removeEventListener("keydown", onKey);
  };
  window.addEventListener("wheel", fire, { passive: true });
  window.addEventListener("touchstart", fire, { passive: true });
  window.addEventListener("pointerdown", fire, { passive: true });
  window.addEventListener("keydown", onKey);
  return stop;
}

export type SmoothScrollOptions = {
  duration?: number;
  offset?: number;
  onComplete?: () => void;
  /** Called instead of onComplete when the user takes over mid-glide. */
  onInterrupt?: () => void;
};

export function smoothScrollToY(
  targetY: number,
  { duration, offset = 0, onComplete, onInterrupt }: SmoothScrollOptions = {},
): () => void {
  const startY = window.scrollY;
  const distance = targetY - offset - startY;

  if (Math.abs(distance) < 1) {
    onComplete?.();
    return () => {};
  }

  const resolvedDuration = duration ?? navScrollDuration(distance) * 1000;
  const startTime = performance.now();
  let frameId = 0;
  let cancelled = false;

  const stopWatching = onUserScrollIntent(() => {
    cancelled = true;
    cancelAnimationFrame(frameId);
    onInterrupt?.();
  });

  const step = (now: number) => {
    if (cancelled) return;
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / resolvedDuration, 1);
    const eased = cinematicEase(progress);
    window.scrollTo({ top: startY + distance * eased, left: 0 });
    if (progress < 1) {
      frameId = requestAnimationFrame(step);
    } else {
      stopWatching();
      onComplete?.();
    }
  };

  frameId = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
    stopWatching();
  };
}

export function smoothScrollToElement(
  element: HTMLElement,
  options: SmoothScrollOptions = {},
): () => void {
  const targetY = element.getBoundingClientRect().top + window.scrollY;
  return smoothScrollToY(targetY, options);
}
