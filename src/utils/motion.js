/**
 * Shared motion utilities — premium admin visual system.
 * All animation helpers must respect prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";

export const MOTION_MS = { fast: 140, standard: 220, slow: 320 };

let mediaQuery = null;
let cachedReduced = false;
const listeners = new Set();

function mq() {
  if (mediaQuery == null && typeof window !== "undefined" && window.matchMedia) {
    mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    cachedReduced = mediaQuery.matches;
    mediaQuery.addEventListener?.("change", (e) => {
      cachedReduced = e.matches;
      listeners.forEach((fn) => fn(cachedReduced));
    });
  }
  return mediaQuery;
}

export function prefersReducedMotion() {
  mq();
  return cachedReduced;
}

/** Live reduced-motion preference for components. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    mq();
    setReduced(cachedReduced);
    const fn = (v) => setReduced(v);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return reduced;
}

/**
 * Shared count-up animation (rAF, cubic-out ease).
 * Reduced motion or same-value → settles instantly, no frame loop.
 */
export function useCountUp(target, duration = 1100) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const end = Number(target) || 0;
    if (prefersReducedMotion()) {
      prev.current = end;
      setVal(end);
      return undefined;
    }
    const start = prev.current;
    if (start === end) {
      setVal(end);
      return undefined;
    }
    let raf;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + (end - start) * ease));
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = end;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}
