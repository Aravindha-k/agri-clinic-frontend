import { useCallback, useEffect, useState } from "react";
import { X, RefreshCw, Bug } from "lucide-react";
import { createPortal } from "react-dom";
import { getEmployeeTrackingDiagnostics } from "../../api/tracking.api";
import { PageLoader } from "../ui/command";
import ErrorRetry from "../ui/ErrorRetry";
import {
  WorkdayStatusBadge,
  GpsDataStatusBadge,
  TrackingTaskBadge,
  MovementBadge,
} from "./TrackingStatusBadges";
import { formatLocationAge, formatDistanceKm } from "../../utils/trackingStatus";
import { formatRouteTimestamp } from "../../utils/employeeRoute";
import { empName } from "../../utils/trackingDisplay";

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-gray-50 last:border-0">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium text-right break-all">{value ?? "—"}</span>
    </div>
  );
}

export default function TrackingDiagnosticPanel({ employee, open, onClose }) {
  const userId = employee?.user_id ?? employee?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getEmployeeTrackingDiagnostics(userId);
      setData(res);
    } catch (err) {
      setError(err?.message || "Failed to load diagnostics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!open || !userId) return;
    load();
  }, [open, userId, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const statusEmp = data ?? employee;

  return createPortal(
    <div className="fixed inset-0 z-[9997] flex justify-end" data-overlay="tracking-diagnostics">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white shadow-2xl h-full w-full max-w-lg overflow-y-auto flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Bug className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">Tracking diagnostics</h2>
              <p className="text-xs text-gray-500 truncate">{empName(employee)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-gray-100" title="Refresh">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {loading && !data ? <PageLoader label="Loading diagnostics…" compact wrap={false} /> : null}
          {error ? <ErrorRetry compact message={error} onRetry={load} /> : null}

          {data ? (
            <>
              <div className="flex flex-wrap gap-2">
                <WorkdayStatusBadge employee={statusEmp} />
                <GpsDataStatusBadge employee={statusEmp} />
                <TrackingTaskBadge employee={statusEmp} />
                <MovementBadge employee={statusEmp} />
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Session</p>
                <Row label="Active workday ID" value={data.active_workday_id ?? data.workday_id} />
                <Row label="Workday started" value={formatRouteTimestamp(data.workday_started_at)} />
                <Row label="Workday ended" value={formatRouteTimestamp(data.workday_ended_at)} />
                <Row label="Device session" value={data.device_session_id} />
                <Row label="Permission" value={data.permission_status} />
                <Row label="Tracking health" value={data.tracking_health} />
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">GPS today</p>
                <Row label="Last location" value={formatRouteTimestamp(data.last_location_at)} />
                <Row label="Age" value={formatLocationAge(data)} />
                <Row label="Total points" value={String(data.total_points ?? 0)} />
                <Row label="Distance" value={formatDistanceKm(data.distance_km)} />
                <Row label="Last speed" value={data.speed != null ? `${data.speed} km/h` : "—"} />
                <Row label="Last accuracy" value={data.accuracy != null ? `${data.accuracy} m` : "—"} />
                <Row label="Battery" value={data.battery_level != null ? `${data.battery_level}%` : "—"} />
                <Row label="Last API received" value={formatRouteTimestamp(data.last_api_received_at)} />
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Last 10 location logs
                </p>
                {(data.last_location_logs ?? []).length === 0 ? (
                  <p className="text-sm text-gray-500">No location logs recorded.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="px-2 py-2 text-left">Time</th>
                          <th className="px-2 py-2 text-left">Lat/Lng</th>
                          <th className="px-2 py-2 text-right">Spd</th>
                          <th className="px-2 py-2 text-right">Acc</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(data.last_location_logs ?? []).map((log) => (
                          <tr key={log.id}>
                            <td className="px-2 py-2 whitespace-nowrap text-gray-700">
                              {formatRouteTimestamp(log.recorded_at ?? log.created_at)}
                            </td>
                            <td className="px-2 py-2 font-mono text-gray-600">
                              {Number(log.latitude).toFixed(5)}, {Number(log.longitude).toFixed(5)}
                            </td>
                            <td className="px-2 py-2 text-right text-gray-600">{log.speed ?? "—"}</td>
                            <td className="px-2 py-2 text-right text-gray-600">{log.accuracy ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
