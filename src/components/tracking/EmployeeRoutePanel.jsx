import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import { Route } from "lucide-react";
import MapBasemapLayers from "../map/MapBasemapLayers";
import MapRouteViewport from "../map/MapRouteViewport";
import EmployeeMapPopup from "../map/EmployeeMapPopup";
import { PageLoader } from "../ui/command";
import { getEmployeeRoute, fetchAllWorkdayLocations } from "../../api/tracking.api";
import {
  todayIsoDate,
  formatRouteTimestamp,
  ROUTE_EMPTY_MESSAGE,
  resolveRouteFetchError,
} from "../../utils/employeeRoute";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

function createColoredIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/**
 * Route tab content for the employee tracking drawer.
 */
export default function EmployeeRoutePanel({ userId, employee, isActive, drawerOpen }) {
  const [routeDate, setRouteDate] = useState(() => todayIsoDate());
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  const workdayId = employee?.workday_id ?? employee?.workdayId ?? null;

  const loadRoute = useCallback(async () => {
    if (!userId) return;

    setRouteLoading(true);
    setRouteError("");
    setRouteData(null);

    try {
      let data = await getEmployeeRoute(userId, { date: routeDate });

      if (
        !data.points.length &&
        routeDate === todayIsoDate() &&
        workdayId
      ) {
        try {
          const fallbackPoints = await fetchAllWorkdayLocations(workdayId);
          if (fallbackPoints.length) {
            data = {
              ...data,
              points: fallbackPoints,
              totalPoints: fallbackPoints.length,
            };
          }
        } catch {
          /* keep primary empty result */
        }
      }

      setRouteData(data);
    } catch (err) {
      setRouteData(null);
      setRouteError(resolveRouteFetchError(err));
    } finally {
      setRouteLoading(false);
    }
  }, [userId, routeDate, workdayId]);

  useEffect(() => {
    if (!drawerOpen || !userId) return;
    setRouteDate(todayIsoDate());
  }, [drawerOpen, userId]);

  useEffect(() => {
    if (!drawerOpen || !isActive || !userId) return;
    loadRoute();
  }, [drawerOpen, isActive, userId, routeDate, loadRoute]);

  const points = routeData?.points ?? [];
  const firstTs = points[0]?.captured_at ?? points[0]?.created_at;
  const lastTs =
    points[points.length - 1]?.captured_at ??
    points[points.length - 1]?.created_at;

  const polylinePositions = useMemo(
    () => points.map((p) => [p.latitude, p.longitude]),
    [points]
  );

  const mapReady = drawerOpen && isActive && points.length > 0 && !routeLoading && !routeError;

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-3 border border-gray-100"
        style={{ boxShadow: SHADOW }}
      >
        <label className="text-xs font-medium text-gray-500" htmlFor="route-date">
          Route date
        </label>
        <input
          id="route-date"
          type="date"
          value={routeDate}
          max={todayIsoDate()}
          disabled={routeLoading}
          onChange={(e) => setRouteDate(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-800 disabled:opacity-50"
        />
        {routeData && !routeError ? (
          <span className="text-xs text-gray-500 ml-auto">
            {routeData.totalPoints} point{routeData.totalPoints === 1 ? "" : "s"}
            {routeData.totalDistanceKm != null ? ` · ${routeData.totalDistanceKm} km` : ""}
          </span>
        ) : null}
      </div>

      {routeLoading ? (
        <PageLoader label="Loading route…" />
      ) : null}

      {!routeLoading && routeError ? (
        <div
          className="text-center text-red-700 bg-red-50 border border-red-200 rounded-xl py-4 px-3 text-sm"
          role="alert"
        >
          {routeError}
        </div>
      ) : null}

      {!routeLoading && !routeError && points.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white rounded-lg border border-gray-100 px-3 py-2">
              <span className="text-gray-400 block mb-0.5">First point</span>
              <span className="font-medium text-gray-800">{formatRouteTimestamp(firstTs)}</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 px-3 py-2">
              <span className="text-gray-400 block mb-0.5">Last point</span>
              <span className="font-medium text-gray-800">{formatRouteTimestamp(lastTs)}</span>
            </div>
          </div>

          <div
            className="h-[400px] rounded-xl overflow-hidden border border-gray-200"
            style={{ boxShadow: SHADOW }}
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
                  icon={createColoredIcon("#3b82f6")}
                >
                  <Popup>
                    <EmployeeMapPopup
                      name={points.length === 1 ? "Route point" : "Route start"}
                      lat={points[0].latitude}
                      lng={points[0].longitude}
                      entity={points[0]}
                      lastUpdated={formatRouteTimestamp(firstTs)}
                    />
                  </Popup>
                </Marker>
                {points.length > 1 ? (
                  <Marker
                    position={[
                      points[points.length - 1].latitude,
                      points[points.length - 1].longitude,
                    ]}
                    icon={createColoredIcon("#ef4444")}
                  >
                    <Popup>
                      <EmployeeMapPopup
                        name="Route end"
                        lat={points[points.length - 1].latitude}
                        lng={points[points.length - 1].longitude}
                        entity={points[points.length - 1]}
                        lastUpdated={formatRouteTimestamp(lastTs)}
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
        <div className="text-center text-gray-500 py-12 px-4">
          <Route className="w-10 h-10 mx-auto mb-3 opacity-40 text-gray-400" />
          <p className="text-sm leading-relaxed max-w-sm mx-auto">{ROUTE_EMPTY_MESSAGE}</p>
        </div>
      ) : null}
    </div>
  );
}
