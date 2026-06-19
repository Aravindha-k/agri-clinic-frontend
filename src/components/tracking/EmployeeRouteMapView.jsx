import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { RefreshCw, Route, Radio } from "lucide-react";
import AdminMapFrame from "../map/AdminMapFrame";
import { RouteEndpointMapLegend } from "../map/MapLegendPanel";
import RouteContrastPolyline from "../map/RouteContrastPolyline";
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
  resolveRouteEmptyState,
  resolveRouteFetchError,
} from "../../utils/employeeRoute";
import { extractRoutePolyline } from "../../utils/dutyTracking";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

function routeIcon(color, size = 16) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,0.45),0 2px 8px rgba(0,0,0,.55)"></div>`,
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
  routeSyncing = false,
  routeError,
  onRetry,
  autoSyncing = false,
  mapHeight = "400px",
  drawerOpen = true,
  dateInputId = "route-date",
  showDutyMeta = false,
}) {
  const points = routeData?.points ?? [];
  const totalPoints = routeData?.totalPoints ?? points.length;
  const canDrawRoute = totalPoints >= 2;

  const summary = useMemo(
    () => computeRouteSummary(routeData, employee),
    [routeData, employee]
  );

  const polylinePositions = useMemo(() => {
    if (!canDrawRoute) return [];
    const fromApi = extractRoutePolyline(routeData);
    if (fromApi.length >= 2) return fromApi;
    const decimated = decimateRoutePoints(points);
    return decimated.map((p) => [p.latitude, p.longitude]);
  }, [points, canDrawRoute, routeData]);

  const showCurrentMarker =
    summary.currentLat != null &&
    summary.currentLng != null &&
    isValidCoord(summary.currentLat, summary.currentLng);

  const currentDiffersFromEnd =
    showCurrentMarker &&
    points.length > 0 &&
    (Math.abs(summary.currentLat - points[points.length - 1].latitude) > 0.0001 ||
      Math.abs(summary.currentLng - points[points.length - 1].longitude) > 0.0001);

  const mapReady = drawerOpen && canDrawRoute && !routeLoading && !routeError;

  const emptyState = resolveRouteEmptyState(routeData);
  const errorMessage = routeError ? resolveRouteFetchError(routeError) : null;

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
          <span className="text-xs text-gray-500 ml-auto flex items-center gap-2">
            {autoSyncing ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Radio className={`w-3 h-3 ${routeSyncing ? "animate-pulse" : ""}`} />
                Live
              </span>
            ) : null}
            {totalPoints} point{totalPoints === 1 ? "" : "s"}
            {summary.distanceKm != null ? ` · ${summary.distanceKm} km` : ""}
          </span>
        ) : autoSyncing ? (
          <span className="text-xs text-emerald-600 ml-auto inline-flex items-center gap-1">
            <Radio className={`w-3 h-3 ${routeSyncing ? "animate-pulse" : ""}`} />
            Auto-syncing…
          </span>
        ) : null}
      </div>

      {routeLoading ? <PageLoader label="Loading route…" compact wrap={false} /> : null}

      {!routeLoading && errorMessage ? (
        <ErrorRetry compact message={errorMessage} onRetry={onRetry} />
      ) : null}

      {!routeLoading && !routeError && totalPoints > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <SummaryCard
            label="Distance"
            value={summary.distanceKm != null ? `${summary.distanceKm} km` : "—"}
          />
          {showDutyMeta ? (
            <>
              <SummaryCard label="Duty start" value={formatRouteTimestamp(routeData?.startTime)} />
              <SummaryCard
                label="Latest update"
                value={formatRouteTimestamp(routeData?.latestUpdate ?? summary.endTime)}
              />
            </>
          ) : (
            <>
              <SummaryCard label="Duration" value={formatRouteDuration(summary.durationMinutes)} />
              <SummaryCard label="Start time" value={formatRouteTimestamp(summary.startTime)} />
              <SummaryCard label="End time" value={formatRouteTimestamp(summary.endTime)} />
            </>
          )}
          <SummaryCard label="Total points" value={String(totalPoints)} />
        </div>
      ) : null}

      {!routeLoading && !routeError && totalPoints === 1 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          {emptyState.subtitle}
        </div>
      ) : null}

      {!routeLoading && !routeError && canDrawRoute ? (
        <AdminMapFrame
          center={[points[0].latitude, points[0].longitude]}
          zoom={14}
          mapKey={`route-${userId}-${routeDate}`}
          height={mapHeight}
          className="rounded-xl border border-gray-200"
          legend={<RouteEndpointMapLegend />}
          legendTitle="Route markers"
          loading={!mapReady}
          loadingLabel="Preparing map…"
        >
          <MapRouteViewport points={points} drawerOpen={drawerOpen} />
          <RouteContrastPolyline positions={polylinePositions} />
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
                  name={
                    employee
                      ? `${employee.employee_name || employee.username || "Employee"} (current)`
                      : "Current location"
                  }
                  lat={summary.currentLat}
                  lng={summary.currentLng}
                  entity={employee}
                  lastUpdated={formatRouteTimestamp(employee?.last_seen)}
                />
              </Popup>
            </Marker>
          ) : null}
        </AdminMapFrame>
      ) : null}

      {!routeLoading && !routeError && totalPoints === 0 ? (
        <div className="section-card">
          <EmptyState
            icon={Route}
            title={emptyState.title}
            subtitle={emptyState.subtitle}
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
