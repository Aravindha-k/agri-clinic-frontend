import { Navigation } from "lucide-react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import AdminMapCard from "./AdminMapCard";
import EmployeeMapPopup from "./EmployeeMapPopup";
import { parseGpsLocationPair } from "../../utils/mapUrls";
import { getStoredMapLocationLabel } from "../../utils/mapLocationLabel";
import "../../utils/leafletSetup";

const farmerMarkerIcon = L.divIcon({
  className: "admin-map-single-marker",
  html: `<div style="width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#059669;border:2.5px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,0.35),0 3px 10px rgba(0,0,0,.35)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 18],
});

/**
 * Farmer field location map — one marker from stored GPS text/coords only.
 */
export default function FarmerFieldLocationMap({
  field,
  fieldLabel,
  className = "",
}) {
  const coords = parseGpsLocationPair(field?.gps_location ?? field?.location);
  if (!coords) return null;

  const locationLabel = getStoredMapLocationLabel(field) || field?.village || field?.land_name || null;
  const title = fieldLabel || field?.land_name || field?.field_name || "Farmer field location";

  return (
    <AdminMapCard
      className={className}
      title={title}
      locationLabel={locationLabel ?? undefined}
      lat={coords.lat}
      lng={coords.lng}
      mapsAriaLabel={
        locationLabel
          ? `Open ${locationLabel} location in Google Maps`
          : `Open ${title} in Google Maps`
      }
      footerMessage="This location was recorded for the farmer profile."
      footerIcon={Navigation}
      mapSize="compact"
      mapProps={{
        center: [coords.lat, coords.lng],
        zoom: 14,
        mapKey: `farmer-field-${field?.id ?? coords.lat}`,
        showFullscreen: false,
      }}
      mapChildren={
        <Marker position={[coords.lat, coords.lng]} icon={farmerMarkerIcon}>
          <Popup autoPan keepInView maxWidth={320}>
            <EmployeeMapPopup
              name={title}
              lat={coords.lat}
              lng={coords.lng}
              entity={field}
            />
          </Popup>
        </Marker>
      }
    />
  );
}
