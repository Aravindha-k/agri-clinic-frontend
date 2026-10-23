import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, Trash2, Loader2, AlertCircle, Store } from "lucide-react";
import {
  getShopDependencySummary,
  archiveShop,
  deleteShopPermanently,
} from "../../api/attendance.api";
import { attendanceErrorMessage } from "../../utils/attendance";

const DEP_LABELS = {
  devices_total: "Devices (all)",
  devices_active: "Devices (active)",
  employee_assignments_total: "Employee assignments (all)",
  employee_assignments_active: "Employee assignments (active)",
  shifts: "Shifts",
  attendance_events: "Attendance events",
  daily_summaries: "Daily summaries",
};

/**
 * Shop archive / permanent-delete dialog. Always fetches the backend
 * dependency summary first: archive is the default safe action; permanent
 * deletion is only offered when the backend reports zero protected history.
 * Attendance history is never deleted.
 */
export default function ShopLifecycleModal({ shop, onDone, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shop?.id) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getShopDependencySummary(shop.id)
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(attendanceErrorMessage(err, "Could not load shop dependencies."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shop?.id]);

  if (!shop) return null;

  const deps = summary?.dependencies || {};
  const canDelete = !!summary?.can_permanently_delete;
  const canArchive = !!summary?.can_archive;

  const run = async (mode) => {
    setError(null);
    setActing(true);
    try {
      const res =
        mode === "archive"
          ? await archiveShop(shop.id, reason)
          : await deleteShopPermanently(shop.id, reason);
      onDone?.(res, mode);
    } catch (err) {
      setError(attendanceErrorMessage(err, "Action failed."));
    } finally {
      setActing(false);
    }
  };

  return createPortal(
    <div className="confirm-dialog-root" role="dialog" aria-modal="true" aria-labelledby="shop-lifecycle-title">
      <div className="confirm-dialog-backdrop" aria-hidden="true" />
      <div className="confirm-dialog-center">
        <div className="enterprise-modal confirm-dialog-modal" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-4">
            <div className="enterprise-modal__icon enterprise-modal__icon--primary">
              <Store className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="shop-lifecycle-title" className="enterprise-modal__title">
                Archive or delete {shop.name}
              </h3>
              <p className="enterprise-modal__message">
                Shops with any attendance history, devices or assignments can
                only be archived — the history is always preserved.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-slate-500 text-[13px]">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Checking dependencies…
            </div>
          ) : error && !summary ? (
            <div className="masters-admin-alert masters-admin-alert--error mt-4" role="alert">
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Linked records
                </p>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-slate-600">
                  {Object.entries(DEP_LABELS).map(([k, label]) => (
                    <li key={k} className="flex justify-between">
                      <span>{label}</span>
                      <span className="font-semibold text-slate-800">{deps[k] ?? 0}</span>
                    </li>
                  ))}
                </ul>
                <p className={`mt-2 text-[12.5px] font-semibold ${canDelete ? "text-emerald-700" : "text-amber-700"}`}>
                  {canDelete
                    ? "No protected history — permanent deletion is allowed."
                    : "Protected history exists — archive only, never delete."}
                </p>
              </div>

              <div className="masters-admin-field mt-4">
                <label>Reason (shown in audit log)</label>
                <input
                  type="text"
                  maxLength={160}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. duplicate test shop, closed branch"
                />
              </div>

              {error && (
                <div className="masters-admin-alert masters-admin-alert--error mt-3" role="alert">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div className="enterprise-modal__footer">
                {canArchive && (
                  <button
                    type="button"
                    onClick={() => run("archive")}
                    disabled={acting}
                    className="btn btn-secondary btn-md"
                  >
                    {acting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    <Archive className="w-4 h-4" aria-hidden="true" /> Archive shop
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => run("delete")}
                  disabled={acting || !canDelete}
                  className="btn btn-danger btn-md"
                  title={canDelete ? "Permanently delete this shop" : "Blocked — shop has protected history"}
                >
                  {acting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  <Trash2 className="w-4 h-4" aria-hidden="true" /> Delete permanently
                </button>
                <button type="button" onClick={onClose} disabled={acting} className="btn btn-secondary btn-md">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
