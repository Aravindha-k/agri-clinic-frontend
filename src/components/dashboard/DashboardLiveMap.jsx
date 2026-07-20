import { MapContainer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import MapBasemapLayers from "../map/MapBasemapLayers";
import EmployeeMapPopup from "../map/EmployeeMapPopup";
import MapEmployeeViewport from "../map/MapEmployeeViewport";
import { TAMIL_NADU_CENTER, TAMIL_NADU_ZOOM } from "../../utils/mapCoordinates";
import { BRAND } from "../../theme/brand";
import { Radio, MapPin } from "lucide-react";

const createMarkerIcon = (isOnline) =>
  L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${isOnline ? BRAND.primaryLight : "#9ca3af"};border:2.5px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,0.4),0 2px 8px rgba(0,0,0,0.5)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

function SectionHeader({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="section-card-header">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="icon-box">
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

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

  return (
    <div className="dashboard-section-card dashboard-section-card--map">
      <SectionHeader
        icon={MapPin}
        title="Live Field Map"
        subtitle={
          mapStatusText ??
          `${mappedCount} employee${mappedCount !== 1 ? "s" : ""} on map · ${workingNow ?? 0} working`
        }
        right={
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
      />
      <div className="dashboard-map-frame">
        <div
          className="absolute top-0 left-0 right-0 h-10 z-[400] pointer-events-none"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.65), transparent)" }}
          aria-hidden="true"
        />
        <MapContainer
          center={safeCenter}
          zoom={safeZoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <MapBasemapLayers />
          <MapEmployeeViewport locations={safeLocations} />
          {safeLocations.map((loc) => (
            <Marker
              key={`${loc.userId ?? loc.employeeName}-${loc.lat}-${loc.lng}`}
              position={[loc.lat, loc.lng]}
              icon={createMarkerIcon(loc.isOnline)}
            >
              <Popup>
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
        </MapContainer>
        {mappedCount === 0 && (
          <div className="dashboard-map-overlay">
            <p className="dashboard-map-overlay__text">
              {hasTrackedEmployees
                ? "No valid employee GPS location available yet."
                : "No employees with valid GPS coordinates right now. Locations appear after field agents start their workday and share location."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
