import { Navigation } from "lucide-react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useVisitLocationAddress } from "../../hooks/useVisitLocationAddress";
import AdminMapCard from "../map/AdminMapCard";
import EmployeeMapPopup from "../map/EmployeeMapPopup";
import { getStoredMapLocationLabel } from "../../utils/mapLocationLabel";
import { formatRouteTimestamp } from "../../utils/employeeRoute";
import "../../utils/leafletSetup";

const visitMarkerIcon = L.divIcon({
  className: "admin-map-single-marker",
  html: `<div style="width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#059669;border:2.5px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,0.35),0 3px 10px rgba(0,0,0,.35)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 18],
});

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
          <Marker position={[coords.lat, coords.lng]} icon={visitMarkerIcon}>
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
                lastUpdated={formatRouteTimestamp(visit?.visit_time ?? visit?.created_at)}
              />
            </Popup>
          </Marker>
        ) : null
      }
    />
  );
}
