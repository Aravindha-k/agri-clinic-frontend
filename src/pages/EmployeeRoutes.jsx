import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Route, Users } from "lucide-react";
import RouteFallback from "../components/RouteFallback";
import ErrorRetry from "../components/ui/ErrorRetry";
import { EmptyState } from "../components/ui/command";
import EmployeeRouteMapView from "../components/tracking/EmployeeRouteMapView";
import { getAdminStatus, getEmployeeRoute, fetchAllWorkdayLocations } from "../api/tracking.api";
import {
  normalizeTrackingEmployee,
  resolveTrackingEmployeeList,
} from "../utils/trackingNormalize";
import {
  todayIsoDate,
  resolveRouteFetchError,
} from "../utils/employeeRoute";
import { empName } from "../utils/trackingDisplay";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

export default function EmployeeRoutes() {
  const [searchParams] = useSearchParams();
  const initialUserId = searchParams.get("userId") || "";
  const [employees, setEmployees] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  const [routeDate, setRouteDate] = useState(() => todayIsoDate());
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  const loadEmployees = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const res = await getAdminStatus();
      const list = resolveTrackingEmployeeList(res).map(normalizeTrackingEmployee);
      setEmployees(list);
      setSelectedUserId((prev) => {
        const preferred = prev || initialUserId;
        if (preferred && list.some((e) => String(e.user_id ?? e.id) === String(preferred))) {
          return String(preferred);
        }
        return list.length ? String(list[0].user_id ?? list[0].id ?? "") : "";
      });
    } catch {
      setListError("Could not load employees. Please try again.");
      setEmployees([]);
    } finally {
      setListLoading(false);
    }
  }, [initialUserId]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const selectedEmployee = useMemo(
    () =>
      employees.find(
        (e) => String(e.user_id ?? e.id) === String(selectedUserId)
      ) ?? null,
    [employees, selectedUserId]
  );

  const loadRoute = useCallback(async () => {
    if (!selectedUserId) return;

    setRouteLoading(true);
    setRouteError("");
    setRouteData(null);

    try {
      let data = await getEmployeeRoute(selectedUserId, { date: routeDate });
      const workdayId = selectedEmployee?.workday_id;

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
          /* optional */
        }
      }

      setRouteData(data);
    } catch (err) {
      setRouteError(resolveRouteFetchError(err));
    } finally {
      setRouteLoading(false);
    }
  }, [selectedUserId, routeDate, selectedEmployee?.workday_id]);

  useEffect(() => {
    if (selectedUserId) loadRoute();
  }, [selectedUserId, routeDate, loadRoute]);

  if (listLoading && employees.length === 0) {
    return <RouteFallback label="Loading route history\u2026" />;
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg">
            <Route className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Employee Route History</h1>
            <p className="text-sm text-gray-500">Full daily GPS trail with route summary</p>
          </div>
        </div>
        <Link
          to="/tracking"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Live Tracking
        </Link>
      </div>

      {listError ? (
        <ErrorRetry message={listError} onRetry={loadEmployees} />
      ) : null}

      {!listLoading && employees.length === 0 && !listError ? (
        <div className="section-card">
          <EmptyState
            icon={Users}
            title="No employees available"
            subtitle="Route history appears once field employees are registered and sharing GPS."
            action={
              <Link to="/employees" className="btn btn-primary btn-md">
                Manage employees
              </Link>
            }
          />
        </div>
      ) : null}

      <div
        className="section-card p-4 flex flex-col sm:flex-row gap-4 sm:items-end"
        style={{ boxShadow: SHADOW }}
      >
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
            <Users className="w-3.5 h-3.5" />
            Employee
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 bg-white"
          >
            {employees.map((emp) => (
              <option key={emp.user_id ?? emp.id} value={String(emp.user_id ?? emp.id)}>
                {empName(emp)}
                {emp.employee_id ? ` (${emp.employee_id})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <EmployeeRouteMapView
        userId={selectedUserId}
        employee={selectedEmployee}
        routeDate={routeDate}
        onRouteDateChange={setRouteDate}
        routeData={routeData}
        routeLoading={routeLoading}
        routeError={routeError}
        onRetry={loadRoute}
        drawerOpen
        mapHeight="520px"
        dateInputId="page-route-date"
      />
    </div>
  );
}
