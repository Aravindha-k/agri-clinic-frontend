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
 */

export const CINE_EASE = [0.16, 1, 0.3, 1];

/**
 * Stage A — canvas arrival.
 * variant="standard": zoom 1.08 → 1 + offset + blur settle (default pages).
 * variant="soft":     opacity + slight rise only — safe around live maps,
 *                     forms and other transform-sensitive content.
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
  const soft = variant === "soft";
  const initial = soft
    ? { opacity: 0, y: 18, filter: "blur(3px)" }
    : { scale: 1.08, x: 30, y: 22, opacity: 0.6, filter: "blur(4px)" };
  return (
    <motion.div
      className={className}
      style={{ transformOrigin: origin }}
      initial={reduce ? false : initial}
      animate={{ scale: 1, x: 0, y: 0, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: duration ?? (soft ? 0.7 : 1.05), ease: CINE_EASE }}
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
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: `blur(${blur}px)` }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        delay: 0.18 + delay + order * 0.09,
        duration,
        ease: CINE_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Lateral push-in for side columns/panels (default slides from right).
 */
export function SlideIn({
  children,
  className,
  side = "right",
  delay = 0.25,
  duration = 0.9,
}) {
  const reduce = useReducedMotion();
  const x = side === "right" ? 40 : -40;
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, x }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration, ease: CINE_EASE }}
    >
      {children}
    </motion.div>
  );
}
