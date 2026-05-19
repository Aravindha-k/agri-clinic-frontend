import { MapPin, Navigation, ExternalLink, Loader2 } from "lucide-react";
import { useVisitLocationAddress } from "../../hooks/useVisitLocationAddress";
import { formatCoordinates } from "../../utils/visitLocation";

/**
 * Human-readable visit location + coordinates + map link.
 */
export default function VisitLocationDisplay({
  visit,
  coords,
  mapsUrl,
  showMap = true,
  mapSlot = null,
  proofNote = true,
}) {
  const { location, geocoding, geocodeFailed } = useVisitLocationAddress(visit);
  const coordText = formatCoordinates(coords?.lat, coords?.lng);

  return (
    <div className="space-y-3">
      {coordText ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {geocoding ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  Resolving place name…
                </div>
              ) : location?.addressLine ? (
                <p className="text-sm font-semibold text-gray-900 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{location.addressLine}</span>
                </p>
              ) : geocodeFailed ? (
                <p className="text-sm text-gray-500 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  Place name unavailable for this GPS point
                </p>
              ) : null}

              <p className="text-xs text-gray-500 font-mono mt-1.5 ml-6">{coordText}</p>
            </div>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 shrink-0"
              >
                Open in Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {showMap && mapSlot}

          {proofNote && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-start gap-2">
              <Navigation className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              GPS coordinates were captured for this visit and serve as field proof of location.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500">No coordinates on file.</p>
      )}
    </div>
  );
}
