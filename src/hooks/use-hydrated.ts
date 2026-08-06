"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * False in the server markup and during hydration, true on every render after.
 * Lets a component keep animation-only nodes (measuring clones, transition
 * copies) out of the server HTML.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
