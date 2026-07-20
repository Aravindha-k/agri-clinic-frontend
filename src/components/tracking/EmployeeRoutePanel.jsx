import { useCallback, useEffect, useRef, useState } from "react";
import { getEmployeeDutyRoute } from "../../api/adminTracking.api";
import {
  todayIsoDate,
  resolveRouteFetchError,
  dayMapScopeKey,
} from "../../utils/employeeRoute";
import {
  dayMapCacheKey,
  saveDayMapSnapshot,
  loadDayMapSnapshot,
} from "../../utils/mapSnapshotCache";
import EmployeeRouteMapView from "./EmployeeRouteMapView";
import useTodayAutoSync from "../../hooks/useTodayAutoSync";

/**
 * Route tab — always keeps last-valid day markers on temporary failures.
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
  const [showingCached, setShowingCached] = useState(false);
  const requestSeqRef = useRef(0);
  const scopeRef = useRef("");
  const routeDataRef = useRef(null);

  useEffect(() => {
    routeDataRef.current = routeData;
  }, [routeData]);

  const isToday = routeDate === todayIsoDate();
  const scopeKey = dayMapScopeKey({
    userId,
    date: routeDate,
    dutySessionId: routeData?.dutySessionId ?? employee?.duty_session_id ?? null,
  });

  const applyScopedData = useCallback((data, requestScope) => {
    setRouteData(data);
    setRouteError("");
    setShowingCached(false);
    scopeRef.current = requestScope;
    if (data?.markers?.length) {
      saveDayMapSnapshot(
        dayMapCacheKey({
          employeeId: userId,
          businessDate: routeDate,
          dutySessionId: data.dutySessionId ?? "nosession",
        }),
        data
      );
    }
  }, [userId, routeDate]);

  const loadRoute = useCallback(
    async (silent = false) => {
      if (!userId) return;

      const requestScope = `${userId}|${routeDate}`;
      const seq = ++requestSeqRef.current;
      const cacheKeyForScope = dayMapCacheKey({
        employeeId: userId,
        businessDate: routeDate,
        dutySessionId: "nosession",
      });

      if (!silent) {
        if (scopeRef.current && scopeRef.current !== requestScope) {
          const snap = loadDayMapSnapshot(cacheKeyForScope);
          if (snap?.routeData?.markers?.length) {
            setRouteData(snap.routeData);
            setShowingCached(true);
          } else {
            setRouteData(null);
            setShowingCached(false);
          }
        }
        scopeRef.current = requestScope;
        setRouteLoading(true);
        setRouteError("");
      } else {
        setRouteSyncing(true);
      }

      try {
        const data = await getEmployeeDutyRoute(userId, { date: routeDate, isToday });
        if (seq !== requestSeqRef.current) return;
        if (`${userId}|${routeDate}` !== requestScope) return;

        const markers = data?.markers ?? [];
        if (markers.length === 0) {
          setRouteData(data ?? { markers: [] });
          setRouteError("");
          setShowingCached(false);
          scopeRef.current = requestScope;
        } else {
          applyScopedData(data, requestScope);
        }
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;

        setRouteError(resolveRouteFetchError(err));
        const current = routeDataRef.current;
        if (!current?.markers?.length) {
          const snap =
            loadDayMapSnapshot(
              dayMapCacheKey({
                employeeId: userId,
                businessDate: routeDate,
                dutySessionId: current?.dutySessionId ?? "nosession",
              })
            ) || loadDayMapSnapshot(cacheKeyForScope);
          if (snap?.routeData?.markers?.length) {
            setRouteData(snap.routeData);
            setShowingCached(true);
          }
        } else {
          setShowingCached(true);
        }
      } finally {
        if (seq === requestSeqRef.current) {
          if (silent) setRouteSyncing(false);
          else setRouteLoading(false);
        }
      }
    },
    [userId, routeDate, isToday, applyScopedData]
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

  return (
    <EmployeeRouteMapView
      userId={userId}
      employee={employee}
      routeDate={routeDate}
      onRouteDateChange={setRouteDate}
      routeData={routeData}
      routeLoading={routeLoading && !(routeData?.markers?.length)}
      routeSyncing={routeSyncing || (routeLoading && Boolean(routeData?.markers?.length))}
      routeError={routeError}
      onRetry={() => loadRoute(false)}
      autoSyncing={isToday}
      drawerOpen={drawerOpen}
      dateInputId="drawer-route-date"
      showDutyMeta
      variant="tracking-drawer"
      mapScopeKey={scopeKey}
      showingCached={showingCached}
    />
  );
}
