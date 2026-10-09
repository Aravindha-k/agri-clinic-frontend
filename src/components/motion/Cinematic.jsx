import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Shared motion primitives for the Kavya admin.
 *
 * One restrained strategy everywhere: a short opacity fade with a
 * small (~8px) rise. No scale, no blur, no long slides — the layout
 * itself carries the premium feel.
 *
 * Replay suppression: the first visit to a pathname plays the entrance;
 * repeat mounts (back/forward nav, soft-refresh remounts) render
 * instantly. Cleared on full page reload.
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
 * Page canvas — subtle fade + small rise on first visit, instant on
 * repeat mounts. `variant`, `origin` accepted for call-site compat.
 */
export function PageCanvas({ children, className, duration }) {
  const reduce = useReducedMotion();
  const played = useEntrancePlayed();
  return (
    <motion.div
      className={className}
      initial={reduce || played ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration ?? 0.3, ease: CINE_EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Sequenced rise for sections that genuinely benefit from ordering
 * (kept minimal — ~40ms per order step, no blur).
 */
export function Reveal({ children, className, order = 0, delay = 0, duration = 0.3 }) {
  const reduce = useReducedMotion();
  const played = useEntrancePlayed();
  return (
    <motion.div
      className={className}
      initial={reduce || played ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay + order * 0.04, duration, ease: CINE_EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Panel arrival — same restrained rise (side param kept for compat).
 */
export function SlideIn({ children, className, delay = 0.08, duration = 0.3 }) {
  const reduce = useReducedMotion();
  const played = useEntrancePlayed();
  return (
    <motion.div
      className={className}
      initial={reduce || played ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: played ? 0 : delay, duration, ease: CINE_EASE }}
    >
      {children}
    </motion.div>
  );
}
