import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import MapCanvas from "./MapCanvas";
import { TAMIL_NADU_CENTER, TAMIL_NADU_ZOOM } from "../../utils/mapCoordinates";
import "../../utils/leafletSetup";

const defaultIcon = L.divIcon({
  className: "admin-map-single-marker",
  html: `<div style="width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#059669;border:2.5px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,0.35),0 3px 10px rgba(0,0,0,.35)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 18],
});

/**
 * One-marker admin map (visit, farmer field, employee point).
 */
export default function SinglePointMap({
  lat,
  lng,
  zoom = 14,
  mapKey = "single-point",
  popup = null,
  mapSize = "compact",
  loading = false,
  error = null,
  statusMessage = null,
  onRetry,
  ...frameProps
}) {
  const hasPoint =
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

  return (
    <MapCanvas
      size={mapSize}
      center={hasPoint ? [Number(lat), Number(lng)] : TAMIL_NADU_CENTER}
      zoom={hasPoint ? zoom : TAMIL_NADU_ZOOM}
      mapKey={mapKey}
      loading={loading}
      loadingLabel="Updating map…"
      error={error}
      statusMessage={!loading && !error ? statusMessage : null}
      onRetry={onRetry}
      showFullscreen={false}
      {...frameProps}
    >
      {hasPoint ? (
        <Marker position={[Number(lat), Number(lng)]} icon={defaultIcon}>
          {popup ? <Popup autoPan keepInView maxWidth={320}>{popup}</Popup> : null}
        </Marker>
      ) : null}
    </MapCanvas>
  );
}
