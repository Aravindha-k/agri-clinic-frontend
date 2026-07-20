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
    <div className="tracking-map-popup">
      <p className="tracking-map-popup__title">{name}</p>

      {statusLabel != null && (
        <p className="tracking-map-popup__row">
          <span className="tracking-map-popup__label">GPS: </span>
          <span className={statusOnline ? "font-semibold text-emerald-600" : "font-medium text-slate-600"}>
            {statusLabel}
          </span>
        </p>
      )}

      {workStatus ? (
        <p className="tracking-map-popup__row">
          <span className="tracking-map-popup__label">Duty: </span>
          <span className="font-medium">{workStatus}</span>
        </p>
      ) : null}

      {movementStatus ? (
        <p className="tracking-map-popup__row">
          <span className="tracking-map-popup__label">Movement: </span>
          <span className="font-medium">{movementStatus}</span>
        </p>
      ) : null}

      {lastUpdated ? (
        <p className="tracking-map-popup__row text-slate-500">
          <span className="tracking-map-popup__label">Updated: </span>
          {lastUpdated}
        </p>
      ) : null}

      <div className="tracking-map-popup__location">
        {loading ? (
          <p className="flex items-center gap-1.5 text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" aria-hidden="true" />
            Resolving location…
          </p>
        ) : addressLine ? (
          <p className="font-medium text-slate-800 flex items-start gap-1.5 leading-relaxed">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{addressLine}</span>
          </p>
        ) : (
          <p className="text-slate-500">Location name unavailable</p>
        )}
        {coordText ? (
          <p className="text-[10px] text-slate-400 font-mono mt-1.5">
            {coordText}
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
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
