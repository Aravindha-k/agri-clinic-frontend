import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import {
  applyLiveMapOperatingBounds,
  fitEmployeeBounds,
  LIVE_FIT_OPTIONS,
  TAMIL_NADU_CENTER,
  TAMIL_NADU_ZOOM,
} from "../../utils/mapCoordinates";

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

  useEffect(() => {
    if (!map) return undefined;
    applyLiveMapOperatingBounds(map);
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

    const rosterSig = (locations || [])
      .map((l) => String(l.userId ?? l.employeeName ?? ""))
      .sort()
      .join("|");

    const manualFit = fitRequestId !== lastFitRequest.current;

    if (!locations?.length) {
      // Empty roster: TN default only (never on every poll once already shown).
      if (manualFit || !didInitialFit.current) {
        didInitialFit.current = true;
        prevRosterSig.current = "";
        lastFitRequest.current = fitRequestId;
        const timer = window.setTimeout(() => {
          try {
            map.closePopup();
            map.invalidateSize({ animate: false });
            map.setView([...TAMIL_NADU_CENTER], TAMIL_NADU_ZOOM, { animate: false });
          } catch {
            /* unmounting */
          }
        }, 80);
        return () => window.clearTimeout(timer);
      }
      return undefined;
    }

    let shouldFit = manualFit;

    if (!shouldFit) {
      if (refitMode === "full") {
        shouldFit = true;
      } else if (refitMode === "roster") {
        shouldFit = rosterSig !== prevRosterSig.current;
      } else {
        // once — first successful non-empty load only; polls/GPS status must not refit
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
        map.closePopup();
        map.closeTooltip();
        fitEmployeeBounds(map, locations, LIVE_FIT_OPTIONS);
      } catch {
        /* map may be unmounting */
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [map, locations, refitMode, fitRequestId]);

  return null;
}
