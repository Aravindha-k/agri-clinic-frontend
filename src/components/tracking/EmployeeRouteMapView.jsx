import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { RefreshCw, Route, Radio } from "lucide-react";
import AdminMapFrame from "../map/AdminMapFrame";
import { RouteEndpointMapLegend } from "../map/MapLegendPanel";
import MapRouteViewport from "../map/MapRouteViewport";
import EmployeeMapPopup from "../map/EmployeeMapPopup";
import { PageLoader, EmptyState } from "../ui/command";
import ErrorRetry from "../ui/ErrorRetry";
import {
  todayIsoDate,
  formatRouteTimestamp,
  formatRouteDuration,
  computeRouteSummary,
  resolveRouteEmptyState,
  resolveRouteFetchError,
} from "../../utils/employeeRoute";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const MARKER_COLORS = {
  start: "#3b82f6",
  visit: "#059669",
  end: "#ef4444",
};

function SummaryCard({ label, value, className = "" }) {
  return (
    <div className={`tracking-drawer-route__summary-card ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function routeIcon(color, size = 18) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size + 8}px;height:${size + 8}px;display:flex;align-items:center;justify-content:center;">
      <div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2.5px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,0.35),0 3px 10px rgba(0,0,0,.45)"></div>
    </div>`,
    iconSize: [size + 8, size + 8],
    iconAnchor: [(size + 8) / 2, size + 4],
  });
}

/**
 * Shared employee day map + summary (drawer tab and dedicated route page).
 * Marker-only: Start, submitted Visits, End (when backend end coords exist).
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
  variant = "default",
  mapScopeKey = null,
}) {
  const markers = routeData?.markers ?? [];
  const markerCount = markers.length;
  const canShowMap = markerCount >= 1;

  const summary = useMemo(
    () => computeRouteSummary(routeData, employee),
    [routeData, employee]
  );

  const mapPoints = useMemo(
    () =>
      markers.map((m) => ({
        latitude: m.latitude,
        longitude: m.longitude,
      })),
    [markers]
  );

  const mapKey =
    mapScopeKey ||
    [
      "day",
      userId ?? "none",
      routeDate ?? "none",
      routeData?.dutySessionId ?? "nosession",
    ].join("-");

  // Keep map mounted while syncing if markers already exist (no TN default flash).
  const mapReady = drawerOpen && canShowMap && !routeError;

  const emptyState = resolveRouteEmptyState(routeData);
  const errorMessage = routeError ? resolveRouteFetchError(routeError) : null;

  const isDrawerVariant = variant === "tracking-drawer";

  return (
    <div className={isDrawerVariant ? "tracking-drawer-route" : "space-y-4"}>
      <div
        className={
          isDrawerVariant
            ? "tracking-drawer-route__toolbar"
            : "flex flex-wrap items-center gap-3 bg-white rounded-xl p-3 border border-gray-100"
        }
        style={isDrawerVariant ? undefined : { boxShadow: SHADOW }}
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
            {markerCount} marker{markerCount === 1 ? "" : "s"}
            {summary.visitCount > 0 ? ` · ${summary.visitCount} visit${summary.visitCount === 1 ? "" : "s"}` : ""}
          </span>
        ) : autoSyncing ? (
          <span className="text-xs text-emerald-600 ml-auto inline-flex items-center gap-1">
            <Radio className={`w-3 h-3 ${routeSyncing ? "animate-pulse" : ""}`} />
            Auto-syncing…
          </span>
        ) : null}
      </div>

      {routeLoading && !canShowMap ? <PageLoader label="Loading route…" compact wrap={false} /> : null}

      {!routeLoading && errorMessage ? (
        <ErrorRetry compact message={errorMessage} onRetry={onRetry} />
      ) : null}

      {!routeLoading && !routeError && markerCount > 0 ? (
        <div
          className={
            isDrawerVariant
              ? "tracking-drawer-route__summary"
              : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
          }
        >
          <SummaryCard label="Visits" value={String(summary.visitCount ?? 0)} />
          {showDutyMeta ? (
            <>
              <SummaryCard label="Duty start" value={formatRouteTimestamp(routeData?.startTime)} />
              <SummaryCard
                label="Duty end"
                value={formatRouteTimestamp(routeData?.endTime)}
              />
            </>
          ) : (
            <>
              <SummaryCard label="Duration" value={formatRouteDuration(summary.durationMinutes)} />
              <SummaryCard label="Start time" value={formatRouteTimestamp(summary.startTime)} />
              <SummaryCard label="End time" value={formatRouteTimestamp(summary.endTime)} />
            </>
          )}
          <SummaryCard
            label="End reason"
            value={summary.endReason ? String(summary.endReason).replace(/_/g, " ") : "—"}
          />
        </div>
      ) : null}

      {!routeLoading && !routeError && markerCount === 1 && markers[0]?.type === "start" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          {emptyState.subtitle}
        </div>
      ) : null}

      {!routeLoading && !routeError && canShowMap ? (
        <AdminMapFrame
          center={[markers[0].latitude, markers[0].longitude]}
          zoom={14}
          mapKey={mapKey}
          height={mapHeight}
          className="rounded-xl border border-gray-200"
          legend={<RouteEndpointMapLegend />}
          legendTitle="Day markers"
          loading={!mapReady}
          loadingLabel="Preparing map…"
        >
          <MapRouteViewport points={mapPoints} drawerOpen={drawerOpen} fitKey={mapKey} />
          {markers.map((marker, idx) => (
            <Marker
              key={`${mapKey}-${marker.type}-${marker.visitId ?? marker.localSyncId ?? idx}`}
              position={[marker.latitude, marker.longitude]}
              icon={routeIcon(MARKER_COLORS[marker.type] ?? MARKER_COLORS.visit, marker.type === "visit" ? 16 : 18)}
            >
              <Popup>
                <EmployeeMapPopup
                  name={
                    marker.type === "start"
                      ? "Start"
                      : marker.type === "end"
                        ? "End"
                        : marker.label || "Visit"
                  }
                  lat={marker.latitude}
                  lng={marker.longitude}
                  entity={marker}
                  lastUpdated={formatRouteTimestamp(marker.captured_at)}
                />
              </Popup>
            </Marker>
          ))}
        </AdminMapFrame>
      ) : null}

      {!routeLoading && !routeError && markerCount === 0 ? (
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
