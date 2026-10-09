import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Shared cinematic motion system for the Kavya admin.
 *
 * Stage model:
 *   A — PageCanvas: canvas arrival (zoomed, offset, softly blurred settle)
 *   B — Reveal:     sequenced identity/metrics/filters/content rises
 *   C — SlideIn:    lateral column push-in
 *
 * Every component honors prefers-reduced-motion (initial={false} →
 * content renders immediately, no animation).
 *
 * Replay suppression: the first visit to a pathname gets the full
 * entrance; repeat mounts (back/forward nav, soft-refresh remounts)
 * get a quick settle so users aren't forced through the cinematic
 * again. Cleared automatically on full page reload.
 */

export const CINE_EASE = [0.16, 1, 0.3, 1];

const playedPaths = new Set();

/**
 * True when this pathname already played its entrance this session.
 * useState initializer reads the set BEFORE the effect registers it,
 * so each mount reports correctly even across remounts.
 */
export function useEntrancePlayed() {
  const { pathname } = useLocation();
  const [played] = useState(() => playedPaths.has(pathname));
  useEffect(() => {
    playedPaths.add(pathname);
  }, [pathname]);
  return played;
}

/**
 * Stage A — canvas arrival.
 * variant="standard": zoom 1.05 → 1 + offset + blur settle (default pages).
 * variant="soft":     opacity + slight rise only — safe around live maps,
 *                     forms and other transform-sensitive content.
 * repeat visits:    brief rise (~0.4s) instead of the full entrance.
 * The rendered element keeps `className` so layout/CSS selectors
 * (e.g. `.page-enter > .employees-hr`) still apply.
 */
export function PageCanvas({
  children,
  className,
  variant = "standard",
  duration,
  origin = "0% 0%",
}) {
  const reduce = useReducedMotion();
  const played = useEntrancePlayed();
  const soft = variant === "soft";
  const initial = played
    ? { opacity: 0, y: 10 }
    : soft
      ? { opacity: 0, y: 16 }
      : { scale: 1.05, x: 24, y: 16, opacity: 0.65, filter: "blur(3px)" };
  return (
    <motion.div
      className={className}
      style={{ transformOrigin: origin }}
      initial={reduce ? false : initial}
      animate={{ scale: 1, x: 0, y: 0, opacity: 1, filter: "blur(0px)" }}
      transition={{
        duration: duration ?? (played ? 0.4 : soft ? 0.55 : 0.9),
        ease: CINE_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stage B/C — sequenced rise for page identity, metric rows, filter
 * bars and content blocks. `order` sequences siblings (+90ms each).
 */
export function Reveal({
  children,
  className,
  order = 0,
  y = 16,
  blur = 3,
  delay = 0,
  duration = 0.62,
}) {
  const reduce = useReducedMotion();
  const played = useEntrancePlayed();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: played ? y / 2 : y, filter: `blur(${blur}px)` }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        delay: (played ? 0 : 0.18) + delay + order * 0.09,
        duration: played ? 0.35 : duration,
        ease: CINE_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Lateral push-in for side columns/panels (default slides from right).
 * Repeat visits swap the long lateral slide for a quick rise.
 */
export function SlideIn({
  children,
  className,
  side = "right",
  delay = 0.25,
  duration = 0.9,
}) {
  const reduce = useReducedMotion();
  const played = useEntrancePlayed();
  const x = side === "right" ? 40 : -40;
  return (
    <motion.div
      className={className}
      initial={reduce ? false : played ? { opacity: 0, y: 10 } : { opacity: 0, x }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        delay: played ? 0.1 : delay,
        duration: played ? 0.4 : duration,
        ease: CINE_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}
