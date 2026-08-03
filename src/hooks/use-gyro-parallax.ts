"use client";

import { useAnimationFrame, useMotionValue, type MotionValue } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const LERP = 0.18;
const GAMMA_RANGE = 16;
const BETA_NEUTRAL = 48;
const BETA_RANGE = 14;

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

export type GyroStatus =
  | "inactive"
  | "needs-gesture"
  | "requesting"
  | "denied"
  | "active"
  | "unsupported";

export type GyroParallaxMotion = {
  x: MotionValue<number>;
  y: MotionValue<number>;
};

export type UseGyroParallaxOptions = {
  enabled?: boolean;
  /** When false, gyro works on any viewport (useful for /test lab). Default true. */
  mobileOnly?: boolean;
};

export type GyroParallaxResult = GyroParallaxMotion & {
  status: GyroStatus;
  requestAccess: () => Promise<void>;
  raw: { gamma: number; beta: number };
};

function needsIosPermission(): boolean {
  if (typeof DeviceOrientationEvent === "undefined") return false;
  const ctor = DeviceOrientationEvent as DeviceOrientationEventWithPermission;
  return typeof ctor.requestPermission === "function";
}

/** Normalized device tilt (-1…1) as motion values. */
export function useGyroParallax(options: boolean | UseGyroParallaxOptions = true): GyroParallaxResult {
  const resolved =
    typeof options === "boolean" ? { enabled: options, mobileOnly: true } : { enabled: true, mobileOnly: true, ...options };

  const { enabled, mobileOnly } = resolved;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const targetRef = useRef({ x: 0, y: 0 });
  const activeRef = useRef(false);
  const rawRef = useRef({ gamma: 0, beta: 0 });
  const [status, setStatus] = useState<GyroStatus>("inactive");
  const [raw, setRaw] = useState({ gamma: 0, beta: 0 });

  const startListeningRef = useRef<() => void>(() => {});
  const stopListeningRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setStatus("inactive");
      return;
    }

    if (typeof DeviceOrientationEvent === "undefined") {
      setStatus("unsupported");
      return;
    }

    const mobileMq = window.matchMedia("(max-width: 767px)");
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const applyOrientation = (gamma: number | null, beta: number | null) => {
      const g = gamma ?? 0;
      const b = (beta ?? BETA_NEUTRAL) - BETA_NEUTRAL;
      rawRef.current = { gamma: g, beta: beta ?? BETA_NEUTRAL };
      targetRef.current = {
        x: clamp(g / GAMMA_RANGE, -1, 1),
        y: clamp(b / BETA_RANGE, -1, 1),
      };
    };

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (!activeRef.current) return;
      applyOrientation(event.gamma, event.beta);
    };

    const onOrientationAbsolute = (event: DeviceOrientationEvent) => {
      if (!activeRef.current) return;
      applyOrientation(event.gamma, event.beta);
    };

    const startListening = () => {
      if (activeRef.current) return;
      activeRef.current = true;
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
      window.addEventListener("deviceorientationabsolute", onOrientationAbsolute, { passive: true });
      setStatus("active");
    };

    const stopListening = () => {
      activeRef.current = false;
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("deviceorientationabsolute", onOrientationAbsolute);
      targetRef.current = { x: 0, y: 0 };
      rawRef.current = { gamma: 0, beta: 0 };
    };

    startListeningRef.current = startListening;
    stopListeningRef.current = stopListening;

    const isEligible = () => {
      if (reducedMq.matches) return false;
      if (mobileOnly && !mobileMq.matches) return false;
      return true;
    };

    const syncEligibility = () => {
      if (!isEligible()) {
        stopListening();
        setStatus("inactive");
        return;
      }

      if (needsIosPermission()) {
        setStatus("needs-gesture");
        return;
      }

      startListening();
    };

    syncEligibility();

    const onMobileChange = () => syncEligibility();
    const onReducedChange = () => syncEligibility();

    mobileMq.addEventListener("change", onMobileChange);
    reducedMq.addEventListener("change", onReducedChange);

    return () => {
      stopListening();
      mobileMq.removeEventListener("change", onMobileChange);
      reducedMq.removeEventListener("change", onReducedChange);
    };
  }, [enabled, mobileOnly]);

  const requestAccess = useCallback(async () => {
    if (!enabled || typeof window === "undefined") return;
    if (typeof DeviceOrientationEvent === "undefined") {
      setStatus("unsupported");
      return;
    }

    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileMq = window.matchMedia("(max-width: 767px)");
    if (reducedMq.matches || (mobileOnly && !mobileMq.matches)) return;

    const OrientationEventCtor = DeviceOrientationEvent as DeviceOrientationEventWithPermission;

    if (typeof OrientationEventCtor.requestPermission === "function") {
      setStatus("requesting");
      try {
        const result = await OrientationEventCtor.requestPermission();
        if (result === "granted") {
          startListeningRef.current();
        } else {
          stopListeningRef.current();
          setStatus("denied");
        }
      } catch {
        stopListeningRef.current();
        setStatus("denied");
      }
      return;
    }

    startListeningRef.current();
  }, [enabled, mobileOnly]);

  useAnimationFrame(() => {
    if (!enabled) return;

    if (!activeRef.current) {
      const cx = x.get();
      const cy = y.get();
      if (Math.abs(cx) > 0.001 || Math.abs(cy) > 0.001) {
        x.set(cx * 0.85);
        y.set(cy * 0.85);
      }
      return;
    }

    const target = targetRef.current;
    const cx = x.get();
    const cy = y.get();
    x.set(cx + (target.x - cx) * LERP);
    y.set(cy + (target.y - cy) * LERP);

    const nextRaw = rawRef.current;
    setRaw((prev) =>
      prev.gamma === nextRaw.gamma && prev.beta === nextRaw.beta ? prev : { ...nextRaw },
    );
  });

  return { x, y, status, requestAccess, raw };
}
