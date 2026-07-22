import { MapPin, Loader2 } from "lucide-react";
import MapOpenInMapsButton from "./MapOpenInMapsButton";
import { formatCoordinates } from "../../utils/visitLocation";

/**
 * Compact location summary card above admin maps.
 */
export default function MapLocationHeader({
  title,
  subtitle,
  locationLabel = null,
  lat = null,
  lng = null,
  locationLoading = false,
  actions = null,
  mapsAriaLabel = null,
  showOpenInMaps = true,
  className = "",
}) {
  const coordText =
    lat != null && lng != null ? formatCoordinates(lat, lng) : null;
  const hasPoint = coordText != null;

  return (
    <header className={`admin-map-location-header ${className}`}>
      <div className="admin-map-location-header__main">
        <div className="admin-map-location-header__icon" aria-hidden="true">
          <MapPin className="w-4 h-4" />
        </div>
        <div className="admin-map-location-header__text min-w-0">
          {title ? <h3 className="admin-map-location-header__title">{title}</h3> : null}
          {subtitle ? (
            <p className="admin-map-location-header__subtitle">{subtitle}</p>
          ) : null}

          {(locationLabel || locationLoading || hasPoint) && (
            <div className="admin-map-location-header__location min-w-0">
              {locationLoading ? (
                <p className="admin-map-location-header__loading">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  Resolving place name…
                </p>
              ) : locationLabel ? (
                <p className="admin-map-location-header__place">{locationLabel}</p>
              ) : hasPoint ? (
                <p className="admin-map-location-header__place admin-map-location-header__place--muted">
                  Coordinates available
                </p>
              ) : null}
              {coordText ? (
                <p className="admin-map-location-header__coords">{coordText}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="admin-map-location-header__actions">
        {actions}
        {showOpenInMaps && hasPoint ? (
          <MapOpenInMapsButton
            lat={lat}
            lng={lng}
            ariaLabel={mapsAriaLabel}
          />
        ) : null}
      </div>
    </header>
  );
}
