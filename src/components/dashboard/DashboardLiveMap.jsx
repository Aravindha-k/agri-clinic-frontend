import { MapContainer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import MapBasemapLayers from "../map/MapBasemapLayers";
import EmployeeMapPopup from "../map/EmployeeMapPopup";
import MapEmployeeViewport from "../map/MapEmployeeViewport";
import { Radio, MapPin } from "lucide-react";

const createMarkerIcon = (isOnline) =>
  L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${isOnline ? "#22c55e" : "#9ca3af"};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25)"></div>`,
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
  validLocations,
  mappedGeoCount,
  mapStatusText,
  workingNow,
  hasTrackedEmployees,
  formatRelative,
}) {
  return (
    <div
      className="lg:col-span-2 section-card overflow-hidden"
      style={{
        boxShadow:
          "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)",
        border: "1px solid rgba(15,118,110,0.08)",
      }}
    >
      <SectionHeader
        icon={MapPin}
        title="Live Field Map"
        subtitle={
          mapStatusText ??
          `${mappedGeoCount} employee${mappedGeoCount !== 1 ? "s" : ""} on map · ${workingNow} working`
        }
        right={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                Offline
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
              <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-700">LIVE</span>
            </div>
          </div>
        }
      />
      <div className="relative" style={{ height: 280 }}>
        <div
          className="absolute top-0 left-0 right-0 h-8 z-[400] pointer-events-none"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.6), transparent)" }}
        />
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <MapBasemapLayers />
          <MapEmployeeViewport locations={validLocations} />
          {validLocations.map((loc) => (
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
                  lastUpdated={formatRelative(loc.lastSeen) || "\u2014"}
                />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {mappedGeoCount === 0 && (
          <div
            className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none"
            style={{ background: "rgba(255,255,255,0.75)" }}
          >
            <p className="text-sm font-medium text-gray-500 px-6 text-center">
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
