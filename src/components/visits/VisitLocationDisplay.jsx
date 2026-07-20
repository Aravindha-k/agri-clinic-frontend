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
    <div className="visit-report-gps">
      {coordText ? (
        <>
          <div className="visit-report-gps__coords">
            <div className="min-w-0 flex-1 space-y-2">
              {geocoding ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" aria-hidden="true" />
                  Resolving place name…
                </div>
              ) : location?.addressLine ? (
                <p className="visit-report-gps__address">
                  <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{location.addressLine}</span>
                </p>
              ) : geocodeFailed ? (
                <p className="text-sm text-slate-500 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  Place name unavailable for this GPS point
                </p>
              ) : null}

              <p className="visit-report-gps__coord-text">{coordText}</p>
            </div>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm shrink-0 inline-flex items-center gap-1"
              >
                Open in Maps
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            )}
          </div>

          {showMap && mapSlot}

          {proofNote && (
            <p className="visit-report-gps__proof">
              <Navigation className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              GPS coordinates were captured for this visit and serve as field proof of location.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-500">No coordinates on file.</p>
      )}
    </div>
  );
}
