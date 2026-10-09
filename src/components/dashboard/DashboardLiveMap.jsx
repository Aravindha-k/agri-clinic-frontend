import { Marker, Popup, Tooltip } from "react-leaflet";
import AdminMapCard from "../map/AdminMapCard";
import { createEmployeePinIcon } from "../map/agriMarkers";
import MapEmployeeViewport from "../map/MapEmployeeViewport";
import EmployeeMapPopup from "../map/EmployeeMapPopup";
import { GpsStatusMapLegend } from "../map/MapLegendPanel";
import { TAMIL_NADU_CENTER, TAMIL_NADU_ZOOM } from "../../utils/mapCoordinates";
import { Radio } from "lucide-react";
import "../../utils/leafletSetup";

export default function DashboardLiveMap({
  mapCenter,
  mapZoom,
  validLocations = [],
  mappedGeoCount = 0,
  mapStatusText,
  workingNow = 0,
  hasTrackedEmployees = false,
  formatRelative,
}) {
  const safeLocations = (Array.isArray(validLocations) ? validLocations : []).filter(
    (loc) =>
      loc &&
      Number.isFinite(Number(loc.lat)) &&
      Number.isFinite(Number(loc.lng))
  );
  const safeCenter =
    Array.isArray(mapCenter) &&
    mapCenter.length === 2 &&
    Number.isFinite(Number(mapCenter[0])) &&
    Number.isFinite(Number(mapCenter[1]))
      ? [Number(mapCenter[0]), Number(mapCenter[1])]
      : [...TAMIL_NADU_CENTER];
  const safeZoom = Number.isFinite(Number(mapZoom)) ? Number(mapZoom) : TAMIL_NADU_ZOOM;
  const safeFormatRelative =
    typeof formatRelative === "function" ? formatRelative : () => "\u2014";
  const mappedCount = mappedGeoCount ?? safeLocations.length;

  const emptyMessage = hasTrackedEmployees
    ? "No valid employee GPS location available yet."
    : "No employees with valid GPS coordinates right now. Locations appear after field agents start their workday and share location.";

  return (
    <AdminMapCard
      className="dashboard-section-card dashboard-section-card--map"
      title="Live employee locations"
      subtitle={
        mapStatusText ??
        `${mappedCount} employee${mappedCount !== 1 ? "s" : ""} on map · ${workingNow ?? 0} working`
      }
      showOpenInMaps={false}
      headerActions={
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="dashboard-map-legend">
            <span className="dashboard-map-legend__item">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              Online
            </span>
            <span className="dashboard-map-legend__item">
              <span className="w-2 h-2 rounded-full bg-slate-300" aria-hidden="true" />
              Offline
            </span>
          </div>
          <div className="dashboard-map-live-badge">
            <Radio className="w-3 h-3 text-emerald-600 animate-pulse" aria-hidden="true" />
            <span className="dashboard-map-live-badge__text">LIVE</span>
          </div>
        </div>
      }
      footerMessage="Markers show each active employee's latest valid location."
      mapSize="mini"
      mapProps={{
        center: safeCenter,
        zoom: safeZoom,
        mapKey: "dashboard-live-map",
        scrollWheelZoom: false,
        legend: <GpsStatusMapLegend />,
        legendTitle: "Employee GPS",
        showFullscreen: false,
        statusMessage: mappedCount === 0 ? emptyMessage : null,
      }}
      mapChildren={
        <>
          <MapEmployeeViewport locations={safeLocations} />
          {safeLocations.map((loc) => (
            <Marker
              key={`${loc.userId ?? loc.employeeName}-${loc.lat}-${loc.lng}`}
              position={[loc.lat, loc.lng]}
              icon={createEmployeePinIcon(loc.isOnline)}
              alt={`${loc.employeeName || "Employee"} location`}
            >
              <Tooltip className="live-employee-tooltip" direction="top" offset={[0, -28]}>
                <span className="map-marker-tooltip">
                  {loc.employeeName || "Name unavailable"}
                  {loc.isOnline ? " · Online" : " · Offline"}
                </span>
              </Tooltip>
              <Popup autoPan keepInView maxWidth={320}>
                <EmployeeMapPopup
                  name={loc.employeeName}
                  lat={loc.lat}
                  lng={loc.lng}
                  entity={loc.properties ?? loc}
                  statusLabel={loc.isOnline ? "Online" : "Offline"}
                  statusOnline={loc.isOnline}
                  lastUpdated={safeFormatRelative(loc.lastSeen) || "\u2014"}
                />
              </Popup>
            </Marker>
          ))}
        </>
      }
    />
  );
}
