import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { fitEmployeeBounds } from "../../utils/mapCoordinates";

/**
 * Fit map to route polyline after drawer/tab open (Leaflet needs invalidateSize).
 */
export default function MapRouteViewport({ points, drawerOpen = true }) {
  const map = useMap();
  const prevSig = useRef("");

  useEffect(() => {
    if (!map || !points?.length || !drawerOpen) return;

    const locations = points.map((p) => ({
      lat: p.latitude ?? p.lat,
      lng: p.longitude ?? p.lng,
    }));

    const sig = locations.map((l) => `${l.lat},${l.lng}`).join("|");
    if (sig === prevSig.current && map.getZoom() > 1) return;
    prevSig.current = sig;

    const timer = window.setTimeout(() => {
      try {
        map.invalidateSize();
        fitEmployeeBounds(map, locations);
      } catch {
        /* map may be unmounting */
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [map, points, drawerOpen]);

  return null;
}
