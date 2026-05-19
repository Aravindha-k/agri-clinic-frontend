import { useEffect, useState } from "react";
import { reverseGeocodeSafe } from "../utils/reverseGeocode";
import {
  getStoredVisitLocation,
  visitNeedsClientGeocode,
} from "../utils/visitLocation";

/**
 * Resolves visit location for display: DB fields first, then one cached Nominatim lookup.
 * @param {object|null} visit
 */
export function useVisitLocationAddress(visit) {
  const [resolved, setResolved] = useState(() => getStoredVisitLocation(visit));
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  const visitId = visit?.id;

  useEffect(() => {
    const stored = getStoredVisitLocation(visit);
    if (stored) {
      setResolved(stored);
      setGeocoding(false);
      setGeocodeFailed(false);
      return undefined;
    }

    if (!visitNeedsClientGeocode(visit)) {
      setResolved(null);
      setGeocoding(false);
      return undefined;
    }

    let cancelled = false;
    setGeocoding(true);
    setGeocodeFailed(false);

    reverseGeocodeSafe(visit.latitude, visit.longitude).then((addr) => {
      if (cancelled) return;
      if (addr) {
        setResolved({
          ...addr,
          addressLine: addr.formatted_address,
          fromStoredFields: false,
        });
        setGeocodeFailed(false);
      } else {
        setResolved(null);
        setGeocodeFailed(true);
      }
      setGeocoding(false);
    });

    return () => {
      cancelled = true;
    };
  }, [visitId, visit?.latitude, visit?.longitude, visit?.formatted_address, visit?.address]);

  return {
    location: resolved,
    geocoding,
    geocodeFailed,
    hasStoredAddress: Boolean(resolved?.fromStoredFields),
  };
}
