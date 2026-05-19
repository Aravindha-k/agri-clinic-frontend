import { useEffect, useState } from "react";
import { reverseGeocodeSafe } from "../utils/reverseGeocode";
import { getStoredMapLocationLabel } from "../utils/mapLocationLabel";

/**
 * Resolve popup address: stored API fields first, then cached Nominatim reverse geocode.
 */
export function useMapLocationAddress(lat, lng, entity, enabled = true) {
  const [addressLine, setAddressLine] = useState(() =>
    enabled ? getStoredMapLocationLabel(entity) : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    const stored = getStoredMapLocationLabel(entity);
    if (stored) {
      setAddressLine(stored);
      setLoading(false);
      return undefined;
    }

    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) {
      setAddressLine(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    reverseGeocodeSafe(la, ln).then((resolved) => {
      if (cancelled) return;
      setAddressLine(resolved?.formatted_address || null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, entity, enabled]);

  return { addressLine, loading };
}
