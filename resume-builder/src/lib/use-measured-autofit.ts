import { useEffect, useRef } from "react";

/**
 * Real-measurement auto-fit for the preview's
 * "render at width = 100/scale%, then transform: scale(scale)" pattern.
 *
 * Binary-searches against the real DOM scrollHeight and writes the result
 * into `layout.autoFitScale`. Combined with `layout.contentScale` (user slider)
 * via computeResumeContentScale — same number used by PDF export.
 */
export function useMeasuredAutoFit({
  enabled,
  contentRef,
  targetHeightPt,
  minScale = 0.55,
  maxScale = 1.05,
  tolerancePt = 0.5,
  deps,
  onFit,
}: {
  enabled: boolean;
  contentRef: React.RefObject<HTMLElement | null>;
  targetHeightPt: number;
  minScale?: number;
  maxScale?: number;
  tolerancePt?: number;
  /** Re-run whenever any of these change (resume content, fonts, spacing…). */
  deps: unknown[];
  onFit: (scale: number) => void;
}) {
  const rafRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const el = contentRef.current;
    if (!el) return;

    const run = () => {
      const node = contentRef.current;
      if (!node) return;

      const prevWidth = node.style.width;
      const prevTransform = node.style.transform;

      const measureAt = (scale: number): number => {
        node.style.width = `${100 / scale}%`;
        node.style.transform = "none";
        return node.scrollHeight * scale;
      };

      if (measureAt(maxScale) <= targetHeightPt + tolerancePt) {
        node.style.width = prevWidth;
        node.style.transform = prevTransform;
        onFit(maxScale);
        return;
      }

      let lo = minScale;
      let hi = maxScale;
      let best = minScale;

      for (let i = 0; i < 18; i += 1) {
        const mid = (lo + hi) / 2;
        const projected = measureAt(mid);
        if (projected <= targetHeightPt + tolerancePt) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }

      node.style.width = prevWidth;
      node.style.transform = prevTransform;

      onFit(Math.round(best * 1000) / 1000);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(run);

    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, targetHeightPt, minScale, maxScale, tolerancePt, ...deps]);
}
