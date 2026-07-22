import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

/**
 * Gently pan to the selected employee marker without changing zoom or refitting.
 */
export default function LiveMapPanController({ lat, lng, userId }) {
  const map = useMap();
  const prevKey = useRef("");

  useEffect(() => {
    if (!map) return undefined;
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return undefined;

    const key = String(userId ?? `${la.toFixed(5)},${ln.toFixed(5)}`);
    if (key === prevKey.current) return undefined;
    prevKey.current = key;

    const timer = window.setTimeout(() => {
      try {
        map.panTo([la, ln], { animate: true, duration: 0.45 });
      } catch {
        /* unmounting */
      }
    }, 60);

    return () => window.clearTimeout(timer);
  }, [map, lat, lng, userId]);

  return null;
}
