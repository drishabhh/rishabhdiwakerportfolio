const cinematicEase = (t: number): number => {
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

export type SmoothScrollOptions = {
  duration?: number;
  offset?: number;
  onComplete?: () => void;
};

export function smoothScrollToY(
  targetY: number,
  { duration, offset = 0, onComplete }: SmoothScrollOptions = {},
): () => void {
  const startY = window.scrollY;
  const distance = targetY - offset - startY;

  if (Math.abs(distance) < 1) {
    onComplete?.();
    return () => {};
  }

  const resolvedDuration =
    duration ?? Math.min(1800, Math.max(880, Math.abs(distance) * 0.52));
  const startTime = performance.now();
  let frameId = 0;
  let cancelled = false;

  const step = (now: number) => {
    if (cancelled) return;
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / resolvedDuration, 1);
    const eased = cinematicEase(progress);
    window.scrollTo({ top: startY + distance * eased, left: 0 });
    if (progress < 1) {
      frameId = requestAnimationFrame(step);
    } else {
      onComplete?.();
    }
  };

  frameId = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
  };
}

export function smoothScrollToElement(
  element: HTMLElement,
  options: SmoothScrollOptions = {},
): () => void {
  const targetY = element.getBoundingClientRect().top + window.scrollY;
  return smoothScrollToY(targetY, options);
}
