import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import RouteFallback from "../components/RouteFallback";
import ErrorRetry from "../components/ui/ErrorRetry";
import { EmptyState, PageHeader } from "../components/ui/command";
import EmployeeRouteMapView from "../components/tracking/EmployeeRouteMapView";
import { getAdminStatus } from "../api/tracking.api";
import { getEmployeeDutyRoute } from "../api/adminTracking.api";
import {
  normalizeTrackingEmployee,
  resolveTrackingEmployeeList,
} from "../utils/trackingNormalize";
import {
  todayIsoDate,
  resolveRouteFetchError,
} from "../utils/employeeRoute";
import { empName } from "../utils/trackingDisplay";

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
  const inFlightRef = useRef(false);

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
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setRouteLoading(true);
    setRouteError("");
    setRouteData(null);

    try {
      const isToday = routeDate === todayIsoDate();
      const data = await getEmployeeDutyRoute(selectedUserId, {
        date: routeDate,
        isToday,
      });
      setRouteData(data);
    } catch (err) {
      setRouteError(resolveRouteFetchError(err));
    } finally {
      inFlightRef.current = false;
      setRouteLoading(false);
    }
  }, [selectedUserId, routeDate]);

  useEffect(() => {
    if (selectedUserId) loadRoute();
  }, [selectedUserId, routeDate, loadRoute]);

  if (listLoading && employees.length === 0) {
    return <RouteFallback label="Loading route history\u2026" />;
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Employee Route History"
        subtitle="Day markers for Start, submitted visits, and End — matched to mobile Day map"
        actions={
          <Link to="/tracking" className="enterprise-link-back">
            <ArrowLeft className="w-4 h-4" />
            Back to Live Tracking
          </Link>
        }
      />

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

      <div className="section-card p-4 flex flex-col sm:flex-row gap-4 sm:items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="form-label flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Employee
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="select"
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
