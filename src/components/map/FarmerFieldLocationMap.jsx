import { Navigation } from "lucide-react";
import { Marker, Popup, Tooltip } from "react-leaflet";
import AdminMapCard from "./AdminMapCard";
import EmployeeMapPopup from "./EmployeeMapPopup";
import { createAgriMarkerIcon } from "./agriMarkers";
import { MARKER_KIND } from "../../utils/mapMarkerKind";
import { parseGpsLocationPair } from "../../utils/mapUrls";
import { getStoredMapLocationLabel } from "../../utils/mapLocationLabel";
import "../../utils/leafletSetup";

const farmerMarkerIcon = createAgriMarkerIcon(MARKER_KIND.CROP, 32);

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
        <Marker position={[coords.lat, coords.lng]} icon={farmerMarkerIcon} alt="Farmer field marker">
          <Tooltip className="live-employee-tooltip" direction="top" offset={[0, -36]}>
            <span className="map-marker-tooltip">{title}</span>
          </Tooltip>
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
