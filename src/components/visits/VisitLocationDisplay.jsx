import { Navigation } from "lucide-react";
import { Marker, Popup, Tooltip } from "react-leaflet";
import { useVisitLocationAddress } from "../../hooks/useVisitLocationAddress";
import AdminMapCard from "../map/AdminMapCard";
import EmployeeMapPopup from "../map/EmployeeMapPopup";
import { createAgriMarkerIcon, markerKindLabel } from "../map/agriMarkers";
import { visitMarkerKind } from "../../utils/mapMarkerKind";
import { getStoredMapLocationLabel } from "../../utils/mapLocationLabel";
import { formatVisitConductedAt } from "../../utils/businessDate";
import "../../utils/leafletSetup";

/**
 * Human-readable visit location + coordinates + shared admin map shell.
 */
export default function VisitLocationDisplay({
  visit,
  coords,
  showMap = true,
  proofNote = true,
}) {
  const { location, geocoding } = useVisitLocationAddress(visit);
  const storedLabel = getStoredMapLocationLabel(visit);
  const locationLabel = location?.addressLine || storedLabel || null;

  const footerMessage = proofNote
    ? "GPS coordinates were captured for this visit and serve as field proof of location."
    : null;

  if (!coords) {
    return <p className="text-sm text-slate-500">No coordinates on file.</p>;
  }

  const visitTitle = visit?.farmer_name
    ? `Visit · ${visit.farmer_name}`
    : "Visit location";
  const kind = visitMarkerKind(visit);
  const visitMarkerIcon = createAgriMarkerIcon(kind, 32);

  return (
    <AdminMapCard
      title={visitTitle}
      locationLabel={locationLabel ?? undefined}
      lat={coords.lat}
      lng={coords.lng}
      locationLoading={geocoding}
      mapsAriaLabel={
        locationLabel
          ? `Open ${locationLabel} location in Google Maps`
          : `Open visit location at ${coords.lat}, ${coords.lng} in Google Maps`
      }
      footerMessage={footerMessage}
      footerIcon={Navigation}
      mapSize="compact"
      mapProps={{
        center: [coords.lat, coords.lng],
        zoom: 14,
        mapKey: `visit-${visit?.id ?? coords.lat}-${coords.lng}`,
        showFullscreen: false,
        statusMessage: !showMap ? "Map preview hidden." : null,
      }}
      mapChildren={
        showMap ? (
          <Marker
            position={[coords.lat, coords.lng]}
            icon={visitMarkerIcon}
            alt={`${markerKindLabel(kind)} marker`}
          >
            <Tooltip className="live-employee-tooltip" direction="top" offset={[0, -36]}>
              <span className="map-marker-tooltip">
                {`${markerKindLabel(kind)}${visit?.farmer_name ? ` · ${visit.farmer_name}` : ""}`}
              </span>
            </Tooltip>
            <Popup
              autoPan
              keepInView
              maxWidth={320}
              autoPanPaddingTopLeft={[24, 120]}
              autoPanPaddingBottomRight={[24, 24]}
            >
              <EmployeeMapPopup
                name={visit?.farmer_name ?? "Visit location"}
                lat={coords.lat}
                lng={coords.lng}
                entity={visit}
                workStatus={visit?.crop_name ? `Crop: ${visit.crop_name}` : null}
                lastUpdated={formatVisitConductedAt(visit)}
              />
            </Popup>
          </Marker>
        ) : null
      }
    />
  );
}
