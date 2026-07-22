import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import AdminMapCard from "../map/AdminMapCard";
import { RouteEndpointMapLegend } from "../map/MapLegendPanel";
import MapRouteViewport from "../map/MapRouteViewport";
import EmployeeMapPopup from "../map/EmployeeMapPopup";
import { empName } from "../../utils/trackingDisplay";
import "../../utils/leafletSetup";
import {
  todayIsoDate,
  formatRouteTimestamp,
  formatRouteDuration,
  computeRouteSummary,
} from "../../utils/employeeRoute";
import { TAMIL_NADU_CENTER, TAMIL_NADU_ZOOM } from "../../utils/mapCoordinates";
import { RefreshCw, Radio } from "lucide-react";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const MARKER_COLORS = {
  start: "#3b82f6",
  visit: "#059669",
  end: "#ef4444",
};

function SummaryCard({ label, value }) {
  return (
    <div className="tracking-drawer-route__summary-card">
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
 * Day map — always mounts. Marker-only Start / Visit / End.
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
  mapHeight = "460px",
  drawerOpen = true,
  dateInputId = "route-date",
  showDutyMeta = false,
  variant = "default",
  mapScopeKey = null,
  showingCached = false,
}) {
  const markers = routeData?.markers ?? [];
  const markerCount = markers.length;

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

  const center = markerCount
    ? [markers[0].latitude, markers[0].longitude]
    : TAMIL_NADU_CENTER;
  const zoom = markerCount === 1 ? 14 : markerCount > 1 ? 12 : TAMIL_NADU_ZOOM;

  const isDrawerVariant = variant === "tracking-drawer";
  const employeeLabel = employee ? empName(employee) : "Employee";

  let statusMessage = null;
  let statusTone = "info";
  let statusDetail = null;

  if (routeLoading && markerCount === 0) {
    statusMessage = "Updating day map…";
  } else if (routeError && markerCount > 0) {
    statusMessage = "Unable to refresh. Showing the last available map data.";
    statusTone = "warn";
  } else if (routeError && markerCount === 0) {
    statusMessage = "Unable to load day map right now.";
    statusTone = "error";
  } else if (showingCached && markerCount > 0) {
    statusMessage = "Showing the last available map data.";
    statusTone = "warn";
  } else if (!routeLoading && markerCount === 0) {
    statusMessage = "No location points were recorded.";
  } else if (markerCount === 1 && markers[0]?.type === "start") {
    statusMessage = "Only the start marker is available for this day so far.";
    statusTone = "info";
  }

  const dateToolbar = (
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
        disabled={routeLoading && markerCount === 0}
        onChange={(e) => onRouteDateChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-800 disabled:opacity-50"
      />
      <span className="text-xs text-gray-500 ml-auto flex items-center gap-2">
        {autoSyncing || routeSyncing ? (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <Radio className={`w-3 h-3 ${routeSyncing ? "animate-pulse" : ""}`} />
            {routeSyncing ? "Updating…" : "Live"}
          </span>
        ) : null}
        {markerCount > 0
          ? `${markerCount} marker${markerCount === 1 ? "" : "s"}`
          : null}
        {summary.visitCount > 0
          ? ` · ${summary.visitCount} visit${summary.visitCount === 1 ? "" : "s"}`
          : ""}
      </span>
    </div>
  );

  return (
    <div className={isDrawerVariant ? "tracking-drawer-route" : "space-y-4"}>
      {dateToolbar}

      {markerCount > 0 ? (
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
              <SummaryCard label="Duty end" value={formatRouteTimestamp(routeData?.endTime)} />
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

      <AdminMapCard
        title="Employee route summary"
        subtitle={`${employeeLabel} · ${routeDate ?? todayIsoDate()}`}
        showOpenInMaps={false}
        footerMessage="This map shows only Start, submitted Visit and End points for the selected day."
        mapSize={isDrawerVariant ? "drawer" : "default"}
        mapProps={{
          center,
          zoom,
          mapKey,
          height: mapHeight,
          legend: <RouteEndpointMapLegend />,
          legendTitle: "Day markers",
          loading: Boolean(routeLoading && markerCount === 0),
          loadingLabel: "Updating map…",
          statusMessage: !routeLoading || markerCount > 0 ? statusMessage : null,
          statusTone,
          statusDetail,
          onRetry,
          fallbackAction: onRetry ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh data
            </button>
          ) : null,
        }}
        mapChildren={
          <>
            <MapRouteViewport points={mapPoints} drawerOpen={drawerOpen} fitKey={mapKey} />
            {markers.map((marker, idx) => (
              <Marker
                key={`${mapKey}-${marker.type}-${marker.visitId ?? marker.localSyncId ?? idx}`}
                position={[marker.latitude, marker.longitude]}
                icon={routeIcon(
                  MARKER_COLORS[marker.type] ?? MARKER_COLORS.visit,
                  marker.type === "visit" ? 16 : 18
                )}
              >
                <Popup autoPan keepInView maxWidth={320}>
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
          </>
        }
      />
    </div>
  );
}
