import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

/**
 * Leaflet paints blank tiles when created at 0×0 (hidden / % height / flex panel).
 * Debounced invalidateSize on mount, resize, visibility, and layout signals.
 */
export default function MapResizeController({ refreshKey = "" }) {
  const map = useMap();
  const timerRef = useRef(0);

  useEffect(() => {
    if (!map) return undefined;

    const schedule = () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        try {
          map.invalidateSize({ animate: false });
        } catch {
          /* map unmounting */
        }
      }, 120);
    };

    schedule();

    const container = map.getContainer();
    let observer;
    if (typeof ResizeObserver !== "undefined" && container) {
      observer = new ResizeObserver(() => schedule());
      observer.observe(container);
      if (container.parentElement) {
        observer.observe(container.parentElement);
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") schedule();
    };

    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(timerRef.current);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [map, refreshKey]);

  return null;
}
