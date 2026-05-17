import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { fitEmployeeBounds } from "../../utils/mapCoordinates";

/**
 * Applies flyTo / fitBounds after employee GPS data loads or updates.
 */
export default function MapEmployeeViewport({ locations }) {
  const map = useMap();
  const prevSig = useRef("");

  useEffect(() => {
    if (!map) return;

    const sig = locations
      .map((l) => `${l.userId ?? l.employeeName}:${l.lat},${l.lng}`)
      .join("|");

    if (sig === prevSig.current && map.getZoom() > 1) {
      return;
    }
    prevSig.current = sig;

    const timer = window.setTimeout(() => {
      map.invalidateSize();
      fitEmployeeBounds(map, locations);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [map, locations]);

  return null;
}
