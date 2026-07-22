import { useEffect } from "react";
import { useMap } from "react-leaflet";

/** Dedicated Leaflet pane above tiles, below popups/tooltips. */
export const EMPLOYEE_MARKER_PANE = "employeeMarkerPane";
export const EMPLOYEE_MARKER_PANE_Z_INDEX = "650";

/**
 * Ensures live employee markers render in a stable visible pane at every zoom.
 */
export default function MapEmployeeMarkerPane() {
  const map = useMap();

  useEffect(() => {
    if (!map) return undefined;

    let pane = map.getPane(EMPLOYEE_MARKER_PANE);
    if (!pane) {
      pane = map.createPane(EMPLOYEE_MARKER_PANE);
    }
    pane.style.zIndex = EMPLOYEE_MARKER_PANE_Z_INDEX;
    pane.style.pointerEvents = "auto";

    return undefined;
  }, [map]);

  return null;
}
