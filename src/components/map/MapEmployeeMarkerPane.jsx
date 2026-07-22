import { useLayoutEffect } from "react";
import { useMap } from "react-leaflet";

/** Above markerPane (600), below tooltipPane (650) / popupPane (700). */
export const EMPLOYEE_MARKER_PANE = "employeeMarkerPane";
export const EMPLOYEE_MARKER_PANE_Z_INDEX = "620";

/**
 * Create the employee marker pane synchronously before markers paint,
 * so hover/click hit-testing works on first render.
 */
export default function MapEmployeeMarkerPane() {
  const map = useMap();

  useLayoutEffect(() => {
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
