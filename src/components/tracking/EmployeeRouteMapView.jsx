import { useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import { RefreshCw, Route } from "lucide-react";
import MapBasemapLayers from "../map/MapBasemapLayers";
import MapRouteViewport from "../map/MapRouteViewport";
import EmployeeMapPopup from "../map/EmployeeMapPopup";
import { PageLoader, EmptyState } from "../ui/command";
import ErrorRetry from "../ui/ErrorRetry";
import {
  todayIsoDate,
  formatRouteTimestamp,
  formatRouteDuration,
  computeRouteSummary,
  decimateRoutePoints,
  ROUTE_EMPTY_MESSAGE,
} from "../../utils/employeeRoute";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

function routeIcon(color, size = 14) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function SummaryCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5" style={{ boxShadow: SHADOW }}>
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

/**
 * Shared employee route map + summary (drawer tab and dedicated route page).
 */
export default function EmployeeRouteMapView({
  userId,
  employee = null,
  routeDate,
  onRouteDateChange,
  routeData,
  routeLoading,
  routeError,
  onRetry,
  mapHeight = "400px",
  drawerOpen = true,
  dateInputId = "route-date",
}) {
  const points = routeData?.points ?? [];
  const summary = useMemo(
    () => computeRouteSummary(routeData, employee),
    [routeData, employee]
  );

  const polylinePositions = useMemo(() => {
    const decimated = decimateRoutePoints(points);
    return decimated.map((p) => [p.latitude, p.longitude]);
  }, [points]);

  const showCurrentMarker =
    summary.currentLat != null &&
    summary.currentLng != null &&
    isValidCoord(summary.currentLat, summary.currentLng);

  const currentDiffersFromEnd =
    showCurrentMarker &&
    points.length > 0 &&
    (Math.abs(summary.currentLat - points[points.length - 1].latitude) > 0.0001 ||
      Math.abs(summary.currentLng - points[points.length - 1].longitude) > 0.0001);

  const mapReady =
    drawerOpen && points.length > 0 && !routeLoading && !routeError;

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-3 border border-gray-100"
        style={{ boxShadow: SHADOW }}
      >
        <label className="text-xs font-medium text-gray-500" htmlFor={dateInputId}>
          Route date
        </label>
        <input
          id={dateInputId}
          type="date"
          value={routeDate}
          max={todayIsoDate()}
          disabled={routeLoading}
          onChange={(e) => onRouteDateChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-800 disabled:opacity-50"
        />
        {routeData && !routeError ? (
          <span className="text-xs text-gray-500 ml-auto">
            {summary.totalPoints} point{summary.totalPoints === 1 ? "" : "s"}
            {summary.distanceKm != null ? ` · ${summary.distanceKm} km` : ""}
          </span>
        ) : null}
      </div>

      {routeLoading ? <PageLoader label="Loading route…" /> : null}

      {!routeLoading && routeError ? (
        <ErrorRetry
          compact
          message="Couldn't load route data. Please try again."
          onRetry={onRetry}
        />
      ) : null}

      {!routeLoading && !routeError && points.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <SummaryCard
              label="Distance"
              value={summary.distanceKm != null ? `${summary.distanceKm} km` : "—"}
            />
            <SummaryCard label="Duration" value={formatRouteDuration(summary.durationMinutes)} />
            <SummaryCard label="Start time" value={formatRouteTimestamp(summary.startTime)} />
            <SummaryCard label="End time" value={formatRouteTimestamp(summary.endTime)} />
            <SummaryCard label="Total points" value={String(summary.totalPoints)} />
          </div>

          <div
            className="rounded-xl overflow-hidden border border-gray-200"
            style={{ boxShadow: SHADOW, height: mapHeight }}
          >
            {mapReady ? (
              <MapContainer
                key={`route-${userId}-${routeDate}-${points.length}`}
                center={[points[0].latitude, points[0].longitude]}
                zoom={14}
                style={{ width: "100%", height: "100%" }}
              >
                <MapBasemapLayers />
                <MapRouteViewport points={points} drawerOpen={drawerOpen} />
                {polylinePositions.length >= 2 ? (
                  <Polyline
                    positions={polylinePositions}
                    color="#059669"
                    weight={4}
                    opacity={0.85}
                  />
                ) : null}
                <Marker
                  position={[points[0].latitude, points[0].longitude]}
                  icon={routeIcon("#3b82f6", 16)}
                >
                  <Popup>
                    <EmployeeMapPopup
                      name="Route start"
                      lat={points[0].latitude}
                      lng={points[0].longitude}
                      entity={points[0]}
                      lastUpdated={formatRouteTimestamp(summary.startTime)}
                    />
                  </Popup>
                </Marker>
                {points.length > 1 ? (
                  <Marker
                    position={[
                      points[points.length - 1].latitude,
                      points[points.length - 1].longitude,
                    ]}
                    icon={routeIcon("#ef4444", 16)}
                  >
                    <Popup>
                      <EmployeeMapPopup
                        name="Route end"
                        lat={points[points.length - 1].latitude}
                        lng={points[points.length - 1].longitude}
                        entity={points[points.length - 1]}
                        lastUpdated={formatRouteTimestamp(summary.endTime)}
                      />
                    </Popup>
                  </Marker>
                ) : null}
                {showCurrentMarker && currentDiffersFromEnd ? (
                  <Marker
                    position={[summary.currentLat, summary.currentLng]}
                    icon={routeIcon("#059669", 18)}
                  >
                    <Popup>
                      <EmployeeMapPopup
                        name={employee ? `${employee.employee_name || employee.username || "Employee"} (current)` : "Current location"}
                        lat={summary.currentLat}
                        lng={summary.currentLng}
                        entity={employee}
                        lastUpdated={formatRouteTimestamp(employee?.last_seen)}
                      />
                    </Popup>
                  </Marker>
                ) : null}
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Preparing map…
              </div>
            )}
          </div>
        </>
      ) : null}

      {!routeLoading && !routeError && (!routeData || points.length === 0) ? (
        <div className="section-card">
          <EmptyState
            icon={Route}
            title="No route recorded for this date"
            subtitle={ROUTE_EMPTY_MESSAGE}
            action={
              onRetry ? (
                <button type="button" onClick={onRetry} className="btn btn-secondary btn-md">
                  <RefreshCw className="w-4 h-4" /> Refresh route
                </button>
              ) : null
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function isValidCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}
