import { motionValue } from "framer-motion";

/**
 * Page scroll speed in px per 60fps frame (positive = scrolling down, 0 at rest).
 * Written once per frame by SmoothScrollProvider; read by the velocity-reactive effects.
 */
export const scrollVelocity = motionValue(0);
