import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { fitEmployeeBounds } from "../../utils/mapCoordinates";

/**
 * Fit map to day markers once per marker identity set.
 * Does not refit on silent heartbeat polls when the marker set is unchanged.
 */
export default function MapRouteViewport({ points, drawerOpen = true, fitKey = "" }) {
  const map = useMap();
  const prevSig = useRef("");

  // Paint TN base map even when the day has zero markers / drawer just opened.
  useEffect(() => {
    if (!map || !drawerOpen) return undefined;
    const timer = window.setTimeout(() => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        /* unmounting */
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [map, drawerOpen, fitKey]);

  useEffect(() => {
    if (!map || !points?.length || !drawerOpen) return undefined;

    const locations = points.map((p) => ({
      lat: p.latitude ?? p.lat,
      lng: p.longitude ?? p.lng,
    }));

    const coordSig = locations.map((l) => `${Number(l.lat).toFixed(5)},${Number(l.lng).toFixed(5)}`).join("|");
    const sig = fitKey ? `${fitKey}::${coordSig}` : coordSig;
    if (sig === prevSig.current && map.getZoom() > 1) return undefined;
    prevSig.current = sig;

    const timer = window.setTimeout(() => {
      try {
        map.invalidateSize({ animate: false });
        fitEmployeeBounds(map, locations);
      } catch {
        /* map may be unmounting */
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [map, points, drawerOpen, fitKey]);

  return null;
}
