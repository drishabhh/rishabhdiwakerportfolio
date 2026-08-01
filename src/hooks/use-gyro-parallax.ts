"use client";

import { useAnimationFrame, useMotionValue, type MotionValue } from "framer-motion";
import { useEffect, useRef } from "react";

const LERP = 0.1;
const GAMMA_RANGE = 26;
const BETA_NEUTRAL = 48;
const BETA_RANGE = 22;

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

export type GyroParallaxMotion = {
  x: MotionValue<number>;
  y: MotionValue<number>;
};

/** Normalized device tilt (-1…1) as motion values, mobile only. */
export function useGyroParallax(enabled: boolean): GyroParallaxMotion {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const targetRef = useRef({ x: 0, y: 0 });
  const activeRef = useRef(false);
  const permissionRef = useRef<"unknown" | PermissionState>("unknown");

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const mobileMq = window.matchMedia("(max-width: 767px)");
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (!activeRef.current) return;

      const gamma = event.gamma ?? 0;
      const beta = (event.beta ?? BETA_NEUTRAL) - BETA_NEUTRAL;

      targetRef.current = {
        x: clamp(gamma / GAMMA_RANGE, -1, 1),
        y: clamp(beta / BETA_RANGE, -1, 1),
      };
    };

    const startListening = () => {
      if (activeRef.current) return;
      activeRef.current = true;
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
    };

    const stopListening = () => {
      activeRef.current = false;
      window.removeEventListener("deviceorientation", onOrientation);
      targetRef.current = { x: 0, y: 0 };
    };

    const syncEligibility = () => {
      const eligible = mobileMq.matches && !reducedMq.matches;
      if (!eligible) {
        stopListening();
        return;
      }

      const OrientationEventCtor = DeviceOrientationEvent as DeviceOrientationEventWithPermission;
      if (typeof OrientationEventCtor.requestPermission !== "function") {
        startListening();
      }
    };

    const requestAccess = async () => {
      const OrientationEventCtor = DeviceOrientationEvent as DeviceOrientationEventWithPermission;
      if (typeof OrientationEventCtor.requestPermission !== "function") return;
      if (permissionRef.current !== "unknown") return;

      try {
        const result = await OrientationEventCtor.requestPermission();
        permissionRef.current = result;
        if (result === "granted") startListening();
      } catch {
        permissionRef.current = "denied";
      }
    };

    const onGesture = () => {
      if (!mobileMq.matches || reducedMq.matches) return;
      void requestAccess();
    };

    syncEligibility();

    const onMobileChange = () => syncEligibility();
    const onReducedChange = () => syncEligibility();

    mobileMq.addEventListener("change", onMobileChange);
    reducedMq.addEventListener("change", onReducedChange);
    window.addEventListener("touchstart", onGesture, { passive: true });
    window.addEventListener("click", onGesture, { passive: true });

    return () => {
      stopListening();
      mobileMq.removeEventListener("change", onMobileChange);
      reducedMq.removeEventListener("change", onReducedChange);
      window.removeEventListener("touchstart", onGesture);
      window.removeEventListener("click", onGesture);
    };
  }, [enabled]);

  useAnimationFrame(() => {
    if (!enabled || !activeRef.current) {
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
  });

  return { x, y };
}
