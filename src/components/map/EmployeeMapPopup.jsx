import { ExternalLink, Loader2, MapPin } from "lucide-react";
import { useMapLocationAddress } from "../../hooks/useMapLocationAddress";
import { formatCoordinates } from "../../utils/visitLocation";

/**
 * Leaflet marker popup: name, status, last updated, address, coords, Maps link.
 */
export default function EmployeeMapPopup({
  name,
  lat,
  lng,
  entity = null,
  statusLabel,
  statusOnline,
  workStatus,
  movementStatus,
  lastUpdated,
  children = null,
}) {
  const { addressLine, loading } = useMapLocationAddress(lat, lng, entity);
  const coordText = formatCoordinates(lat, lng);
  const mapsUrl =
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : null;

  return (
    <div className="min-w-[220px] max-w-[280px] p-1 space-y-2">
      <p className="font-bold text-sm text-gray-900 leading-snug">{name}</p>

      {statusLabel != null && (
        <p className="text-xs">
          <span className="text-gray-400">GPS: </span>
          <span
            className={
              statusOnline ? "font-semibold text-emerald-600" : "font-medium text-gray-600"
            }
          >
            {statusLabel}
          </span>
        </p>
      )}

      {workStatus ? (
        <p className="text-xs text-gray-600">
          <span className="text-gray-400">Work: </span>
          <span className="font-medium">{workStatus}</span>
        </p>
      ) : null}

      {movementStatus ? (
        <p className="text-xs text-gray-600">
          <span className="text-gray-400">Movement: </span>
          <span className="font-medium">{movementStatus}</span>
        </p>
      ) : null}

      {lastUpdated ? (
        <p className="text-xs text-gray-500">
          <span className="text-gray-400">Last updated: </span>
          {lastUpdated}
        </p>
      ) : null}

      <div className="text-xs border-t border-gray-100 pt-2">
        {loading ? (
          <p className="flex items-center gap-1.5 text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            Resolving location…
          </p>
        ) : addressLine ? (
          <p className="font-medium text-gray-800 flex items-start gap-1.5 leading-relaxed">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{addressLine}</span>
          </p>
        ) : (
          <p className="text-gray-500">Location name unavailable</p>
        )}
        {coordText ? (
          <p className="text-[10px] text-gray-400 font-mono mt-1.5">
            Coordinates: {coordText}
          </p>
        ) : null}
      </div>

      {children}

      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Open in Maps
          <ExternalLink className="w-3 h-3" />
        </a>
      ) : null}
    </div>
  );
}
