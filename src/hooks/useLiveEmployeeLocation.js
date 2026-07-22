import { useEffect, useState } from "react";
import { reverseGeocodeSafe } from "../utils/reverseGeocode";
import {
  getLiveEmployeeLocationLabel,
  resolveLiveLocationDisplay,
} from "../utils/liveEmployeeMarkerMeta";

/**
 * Resolve live-marker location for popup:
 * 1) backend area fields
 * 2) cached reverse geocode (only when coords exist and backend label missing)
 * 3) coordinates fallback
 *
 * Does not block marker rendering; geocode runs only when enabled (popup open).
 */
export function useLiveEmployeeLocation(emp, lat, lng, enabled = true) {
  const backendLabel = getLiveEmployeeLocationLabel(emp);
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [loading, setLoading] = useState(false);

  const la = Number(lat);
  const ln = Number(lng);
  const hasCoords = Number.isFinite(la) && Number.isFinite(ln);
  const roundedKey = hasCoords ? `${la.toFixed(5)},${ln.toFixed(5)}` : "";

  useEffect(() => {
    if (!enabled || backendLabel || !hasCoords) {
      setResolvedAddress(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    reverseGeocodeSafe(la, ln).then((resolved) => {
      if (cancelled) return;
      setResolvedAddress(resolved?.formatted_address || resolved?.location_name || null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // Only re-run when rounded coords change or backend label appears — not every poll object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, backendLabel, roundedKey]);

  const display = resolveLiveLocationDisplay(emp, lat, lng, resolvedAddress);

  return {
    ...display,
    loading: Boolean(loading && !display.hasAreaName),
  };
}
