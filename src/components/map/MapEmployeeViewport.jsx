import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { fitEmployeeBounds } from "../../utils/mapCoordinates";

/**
 * Applies flyTo / fitBounds after employee GPS data loads or updates.
 * @param {"full"|"roster"} [refitMode] — `roster` refits only when the employee set changes (not on coordinate drift).
 */
export default function MapEmployeeViewport({ locations, refitMode = "full" }) {
  const map = useMap();
  const prevSig = useRef("");

  useEffect(() => {
    if (!map) return;

    const sig =
      refitMode === "roster"
        ? locations
            .map((l) => String(l.userId ?? l.employeeName ?? ""))
            .sort()
            .join("|")
        : locations
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
