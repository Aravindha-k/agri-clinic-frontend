import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { fitEmployeeBounds } from "../../utils/mapCoordinates";

/**
 * Live-map camera control.
 *
 * @param {"once"|"roster"|"full"} [refitMode]
 *   - once: fit on first non-empty load only (default for live tracking)
 *   - roster: refit when the employee ID set changes
 *   - full: refit whenever coordinates change
 * @param {number} [fitRequestId] — increment to force a manual Fit All / Reset View
 */
export default function MapEmployeeViewport({
  locations,
  refitMode = "once",
  fitRequestId = 0,
}) {
  const map = useMap();
  const didInitialFit = useRef(false);
  const prevRosterSig = useRef("");
  const lastFitRequest = useRef(0);

  // Always invalidate after mount so TN tiles paint even with zero markers.
  useEffect(() => {
    if (!map) return undefined;
    const timer = window.setTimeout(() => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        /* unmounting */
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (!map) return undefined;

    if (!locations?.length) {
      didInitialFit.current = false;
      prevRosterSig.current = "";
      return undefined;
    }

    const rosterSig = locations
      .map((l) => String(l.userId ?? l.employeeName ?? ""))
      .sort()
      .join("|");

    const manualFit = fitRequestId !== lastFitRequest.current;
    let shouldFit = manualFit;

    if (!shouldFit) {
      if (refitMode === "full") {
        shouldFit = true;
      } else if (refitMode === "roster") {
        shouldFit = rosterSig !== prevRosterSig.current;
      } else {
        // once
        shouldFit = !didInitialFit.current;
      }
    }

    if (!shouldFit) return undefined;

    prevRosterSig.current = rosterSig;
    didInitialFit.current = true;
    lastFitRequest.current = fitRequestId;

    const timer = window.setTimeout(() => {
      try {
        map.invalidateSize({ animate: false });
        fitEmployeeBounds(map, locations);
      } catch {
        /* map may be unmounting */
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [map, locations, refitMode, fitRequestId]);

  return null;
}
