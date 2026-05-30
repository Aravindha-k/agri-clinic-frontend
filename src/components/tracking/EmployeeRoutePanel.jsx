import { useCallback, useEffect, useState } from "react";
import { getEmployeeRoute, fetchAllWorkdayLocations } from "../../api/tracking.api";
import { todayIsoDate, resolveRouteFetchError } from "../../utils/employeeRoute";
import EmployeeRouteMapView from "./EmployeeRouteMapView";

/**
 * Route tab in employee drawer — loads route for one employee.
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

      if (!data.points.length && routeDate === todayIsoDate() && workdayId) {
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
          /* optional fallback */
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

  return (
    <EmployeeRouteMapView
      userId={userId}
      employee={employee}
      routeDate={routeDate}
      onRouteDateChange={setRouteDate}
      routeData={routeData}
      routeLoading={routeLoading}
      routeError={routeError}
      onRetry={loadRoute}
      drawerOpen={drawerOpen}
      dateInputId="drawer-route-date"
    />
  );
}
