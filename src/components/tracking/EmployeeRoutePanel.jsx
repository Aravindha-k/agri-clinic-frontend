import { useCallback, useEffect, useRef, useState } from "react";
import { getEmployeeDutyRoute } from "../../api/adminTracking.api";
import {
  todayIsoDate,
  resolveRouteFetchError,
  dayMapScopeKey,
} from "../../utils/employeeRoute";
import EmployeeRouteMapView from "./EmployeeRouteMapView";
import useTodayAutoSync from "../../hooks/useTodayAutoSync";

/**
 * Route tab in employee drawer — duty day map with single-flight fetch + scope isolation.
 */
export default function EmployeeRoutePanel({
  userId,
  employee,
  isActive,
  drawerOpen,
  refreshToken = 0,
}) {
  const [routeDate, setRouteDate] = useState(() => todayIsoDate());
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeSyncing, setRouteSyncing] = useState(false);
  const [routeError, setRouteError] = useState("");
  const requestSeqRef = useRef(0);
  const scopeRef = useRef("");

  const isToday = routeDate === todayIsoDate();
  const scopeKey = dayMapScopeKey({
    userId,
    date: routeDate,
    dutySessionId: routeData?.dutySessionId ?? employee?.duty_session_id ?? null,
  });

  const loadRoute = useCallback(
    async (silent = false) => {
      if (!userId) return;

      const requestScope = `${userId}|${routeDate}`;
      const seq = ++requestSeqRef.current;

      if (!silent) {
        // Clear only when employee/date scope changes — never flash default map on silent poll.
        if (scopeRef.current && scopeRef.current !== requestScope) {
          setRouteData(null);
        }
        scopeRef.current = requestScope;
        setRouteLoading(true);
        setRouteError("");
      } else {
        setRouteSyncing(true);
      }

      try {
        const data = await getEmployeeDutyRoute(userId, { date: routeDate, isToday });
        if (seq !== requestSeqRef.current) return; // stale response
        if (`${userId}|${routeDate}` !== requestScope) return;

        setRouteData(data);
        setRouteError("");
        scopeRef.current = requestScope;
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        if (!silent) {
          // Authoritative failure for this scope — clear markers.
          setRouteData(null);
          setRouteError(resolveRouteFetchError(err));
        }
        // Silent poll keeps existing valid markers on transient errors.
      } finally {
        if (seq === requestSeqRef.current) {
          if (silent) setRouteSyncing(false);
          else setRouteLoading(false);
        }
      }
    },
    [userId, routeDate, isToday]
  );

  useEffect(() => {
    if (!drawerOpen || !userId) return;
    setRouteDate(todayIsoDate());
  }, [drawerOpen, userId]);

  useEffect(() => {
    if (!drawerOpen || !isActive || !userId) return;
    loadRoute(false);
  }, [drawerOpen, isActive, userId, routeDate, loadRoute, refreshToken]);

  useTodayAutoSync({
    date: routeDate,
    enabled: drawerOpen && isActive && Boolean(userId),
    onPoll: loadRoute,
  });

  // Hide map only when loading a new scope with no retained markers.
  const showBlockingLoader = routeLoading && !routeData;

  return (
    <EmployeeRouteMapView
      userId={userId}
      employee={employee}
      routeDate={routeDate}
      onRouteDateChange={setRouteDate}
      routeData={routeData}
      routeLoading={showBlockingLoader}
      routeSyncing={routeSyncing || (routeLoading && Boolean(routeData))}
      routeError={routeError}
      onRetry={() => loadRoute(false)}
      autoSyncing={isToday}
      drawerOpen={drawerOpen}
      dateInputId="drawer-route-date"
      showDutyMeta
      variant="tracking-drawer"
      mapScopeKey={scopeKey}
    />
  );
}
