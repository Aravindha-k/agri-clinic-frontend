import { useCallback, useEffect, useRef, useState } from "react";
import { useOverlayLock } from "../../utils/overlayLock";
import { X, RefreshCw, Activity } from "lucide-react";
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
      <span className="text-gray-900 font-medium text-right break-words">{value ?? "—"}</span>
    </div>
  );
}

/**
 * Operational field-status drawer for Live Tracking.
 * Uses existing diagnostics API; omits device session IDs and raw debug dumps.
 */
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
      setError(err?.message || "Failed to load field status");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!open || !userId) return;
    load();
  }, [open, userId, load]);

  const panelRef = useRef(null);
  useOverlayLock({ open, onClose, panelRef });

  if (!open) return null;

  const statusEmp = data ?? employee;
  const workdayActive = data?.active_workday_id ?? data?.workday_id;
  const workdayLabel = workdayActive
    ? data?.workday_ended_at
      ? "Ended"
      : "Active"
    : "None";

  return createPortal(
    <div
      ref={panelRef}
      className="fixed inset-0 z-[9997] flex justify-end"
      data-overlay="tracking-field-status"
      role="dialog"
      aria-modal="true"
      aria-label="Field status"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white shadow-2xl h-full w-full max-w-lg overflow-y-auto flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">Field status</h2>
              <p className="text-xs text-gray-500 truncate">{empName(employee)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="p-2.5 rounded-lg hover:bg-gray-100"
              aria-label="Refresh field status"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-lg hover:bg-gray-100"
              aria-label="Close field status"
            >
              <X className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {loading && !data ? <PageLoader label="Loading field status…" compact wrap={false} /> : null}
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
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Work day</p>
                <Row label="Status" value={workdayLabel} />
                <Row label="Started" value={formatRouteTimestamp(data.workday_started_at)} />
                <Row label="Ended" value={formatRouteTimestamp(data.workday_ended_at)} />
                <Row label="Tracking health" value={data.tracking_health} />
                <Row
                  label="Health reason"
                  value={
                    typeof data.health_reason === "string"
                      ? data.health_reason
                      : typeof data.tracking_health_reason === "string"
                        ? data.tracking_health_reason
                        : "—"
                  }
                />
                <Row label="Permission" value={data.permission_status} />
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">GPS &amp; updates</p>
                <Row label="Last GPS received" value={formatRouteTimestamp(data.last_location_at)} />
                <Row label="Freshness" value={formatLocationAge(data)} />
                <Row label="Last successful update" value={formatRouteTimestamp(data.last_api_received_at)} />
                <Row label="Points today" value={String(data.total_points ?? 0)} />
                <Row label="Distance today" value={formatDistanceKm(data.distance_km)} />
                <Row
                  label="Last accuracy"
                  value={data.accuracy != null ? `${data.accuracy} m` : "—"}
                />
                <Row
                  label="Battery"
                  value={data.battery_level != null ? `${data.battery_level}%` : "—"}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
