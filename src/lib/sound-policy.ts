"use client";

import { useEffect, useRef } from "react";

/**
 * Browsers only let a video play WITH sound after the visitor has clicked,
 * tapped or pressed a key somewhere on the page. These helpers make every reel
 * start unmuted whenever the browser allows it, and switch the sound on at the
 * visitor's very first click/tap when it had to start muted.
 */
export function canPlayWithSound(): boolean {
  if (typeof navigator === "undefined") return false;
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  // Browsers without the API: assume allowed; a refused play() falls back to muted.
  return activation ? activation.hasBeenActive : true;
}

/** Mark mute/unmute buttons with this so the first-click unlock doesn't fight them. */
export const SOUND_TOGGLE_ATTR = "data-sound-toggle";

/**
 * While `enabled`, the next click/tap/key press anywhere on the page calls
 * `onUnlock` (ignoring the mute button itself, which handles its own toggle).
 */
export function useSoundUnlock(enabled: boolean, onUnlock: () => void) {
  const cb = useRef(onUnlock);
  useEffect(() => {
    cb.current = onUnlock;
  }, [onUnlock]);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: Event) => {
      const target = e.target as Element | null;
      if (target?.closest?.(`[${SOUND_TOGGLE_ATTR}]`)) return;
      cb.current();
    };
    const opts = { capture: true } as const;
    window.addEventListener("pointerup", handler, opts);
    window.addEventListener("keydown", handler, opts);
    return () => {
      window.removeEventListener("pointerup", handler, opts);
      window.removeEventListener("keydown", handler, opts);
    };
  }, [enabled]);
}
