import { useCallback, useEffect, useRef, useState } from "react";
import { getEmployeeDutyRoute } from "../../api/adminTracking.api";
import { todayIsoDate, resolveRouteFetchError } from "../../utils/employeeRoute";
import EmployeeRouteMapView from "./EmployeeRouteMapView";
import useTodayAutoSync from "../../hooks/useTodayAutoSync";

/**
 * Route tab in employee drawer — today's route via duty tracking API with live refresh.
 */
export default function EmployeeRoutePanel({ userId, employee, isActive, drawerOpen }) {
  const [routeDate, setRouteDate] = useState(() => todayIsoDate());
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeSyncing, setRouteSyncing] = useState(false);
  const [routeError, setRouteError] = useState("");
  const inFlightRef = useRef(false);

  const isToday = routeDate === todayIsoDate();

  const loadRoute = useCallback(
    async (silent = false) => {
      if (!userId) return;
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      if (silent) {
        setRouteSyncing(true);
      } else {
        setRouteLoading(true);
        setRouteError("");
      }

      try {
        const data = await getEmployeeDutyRoute(userId, { date: routeDate, isToday });
        setRouteData(data);
        setRouteError("");
      } catch (err) {
        if (!silent) {
          setRouteData(null);
          setRouteError(resolveRouteFetchError(err));
        }
      } finally {
        inFlightRef.current = false;
        if (silent) setRouteSyncing(false);
        else setRouteLoading(false);
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
  }, [drawerOpen, isActive, userId, routeDate, loadRoute]);

  useTodayAutoSync({
    date: routeDate,
    enabled: drawerOpen && isActive && Boolean(userId),
    onPoll: loadRoute,
  });

  return (
    <EmployeeRouteMapView
      userId={userId}
      employee={employee}
      routeDate={routeDate}
      onRouteDateChange={setRouteDate}
      routeData={routeData}
      routeLoading={routeLoading}
      routeSyncing={routeSyncing}
      routeError={routeError}
      onRetry={() => loadRoute(false)}
      autoSyncing={isToday}
      drawerOpen={drawerOpen}
      dateInputId="drawer-route-date"
      showDutyMeta
    />
  );
}
