import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/command";
import {
  RefreshCw,
  AlertCircle,
  Loader2,
  Fingerprint,
  Plus,
  Ban,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import AttendanceTabs from "../../components/attendance/AttendanceTabs";
import {
  getFaceEnrollments,
  authorizeFaceEnrollment,
  revokeFaceEnrollment,
  getAttendanceEmployees,
  getAttendanceShops,
  getDevices,
} from "../../api/attendance.api";
import {
  attendanceErrorMessage,
  formatDateTime,
} from "../../utils/attendance";

const inputClass = "masters-admin-field";

const STATUS_STYLES = {
  PENDING: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  REVOKED: "bg-red-50 text-red-700",
  REPLACED: "bg-slate-100 text-slate-600",
};

function EnrollmentStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${STATUS_STYLES[status] || "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}

/**
 * Face enrollment lifecycle manager — metadata only.
 * Authorizing creates a PENDING enrollment; the kiosk records face samples
 * on-device and the backend flips status to ACTIVE. No images or embeddings
 * ever pass through this panel.
 */
function AuthorizeForm({ employees, shops, devices, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ employee: "", shop: "", device: "", consent: false });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const activeEmployees = employees.filter((e) => e.is_active);
  const activeShops = shops.filter((s) => s.is_active && !s.archived_at);
  const shopDevices = devices.filter(
    (d) => d.is_active && !d.revoked_at && String(d.shop) === String(form.shop)
  );

  const pickEmployee = (id) => {
    const emp = employees.find((e) => String(e.id) === String(id));
    setForm((f) => ({
      ...f,
      employee: id,
      // Pre-fill the employee's assigned shop — backend validates it anyway.
      shop: emp?.shop_id ?? f.shop,
      device: emp?.shop_id === f.shop ? f.device : "",
    }));
  };

  const valid = form.employee !== "" && form.shop !== "" && form.device !== "" && form.consent;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
      className="masters-admin-form"
    >
      <div className={inputClass}>
        <label>Employee *</label>
        <select required value={form.employee} onChange={(e) => pickEmployee(e.target.value)}>
          <option value="">Select employee…</option>
          {activeEmployees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name} ({e.employee_code})
            </option>
          ))}
        </select>
      </div>
      <div className={inputClass}>
        <label>Assigned Shop *</label>
        <select required value={form.shop} onChange={(e) => setForm((f) => ({ ...f, shop: e.target.value, device: "" }))}>
          <option value="">Select shop…</option>
          {activeShops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.area ? ` — ${s.area}` : ""}
            </option>
          ))}
        </select>
        <p className="text-[11.5px] text-slate-500 mt-1">
          Auto-filled from the employee's current assignment; must be a shop the
          employee is assigned to.
        </p>
      </div>
      <div className={inputClass}>
        <label>Registered Device *</label>
        <select required value={form.device} onChange={(e) => set("device", e.target.value)} disabled={!form.shop}>
          <option value="">{form.shop ? "Select device…" : "Select a shop first"}</option>
          {shopDevices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name || d.device_uid} ({d.device_uid})
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.consent}
          onChange={(e) => set("consent", e.target.checked)}
          className="mt-0.5 rounded border-slate-300"
        />
        <span>
          <strong>Employee consent recorded.</strong> The employee has agreed to
          face enrollment on this device. No photo or biometric data is captured
          here — the kiosk records it on-device.
        </span>
      </label>
      <div className="masters-admin-form__foot">
        <button type="submit" disabled={loading || !valid} className="btn btn-primary btn-md">
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          Authorize Enrollment
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary btn-md">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function AttendanceEnrollment() {
  const [enrollments, setEnrollments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shops, setShops] = useState([]);
  const [devices, setDevices] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [en, emp, sh, dev] = await Promise.all([
        getFaceEnrollments(statusFilter ? { status: statusFilter } : {}),
        getAttendanceEmployees(),
        getAttendanceShops({ include_archived: true }),
        getDevices(),
      ]);
      setEnrollments(en.results);
      setEmployees(emp.results);
      setShops(sh.results);
      setDevices(dev.results);
    } catch (err) {
      setError(attendanceErrorMessage(err, "Failed to load face enrollments."));
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAuthorize = async (form) => {
    setSaveError(null);
    setSaving(true);
    try {
      await authorizeFaceEnrollment({
        employee: Number(form.employee),
        shop: Number(form.shop),
        device: Number(form.device),
        consent_recorded: true,
      });
      setFormOpen(false);
      setNotice("Enrollment authorized — status PENDING until the kiosk confirms.");
      load();
    } catch (err) {
      setSaveError(attendanceErrorMessage(err, "Authorization failed."));
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setActionError(null);
    setActing(true);
    try {
      await revokeFaceEnrollment(revokeTarget.id);
      setRevokeTarget(null);
      setNotice(`Enrollment for ${revokeTarget.employee_name || revokeTarget.employee_ref} revoked.`);
      load();
    } catch (err) {
      setActionError(attendanceErrorMessage(err, "Revoke failed."));
    } finally {
      setActing(false);
    }
  };

  const counts = useMemo(() => {
    const c = { PENDING: 0, ACTIVE: 0, REVOKED: 0, REPLACED: 0 };
    enrollments.forEach((e) => {
      if (c[e.status] != null) c[e.status] += 1;
    });
    return c;
  }, [enrollments]);

  return (
    <div className="masters-admin page-container">
      <PageHeader
        title="Face Enrollment"
        subtitle="Authorize and manage employee face enrollment on attendance devices"
        badge={
          <span className="masters-admin-header__badge">
            <Fingerprint className="w-3 h-3" aria-hidden="true" />
            Attendance
          </span>
        }
        actions={
          <>
            <button type="button" onClick={() => { setSaveError(null); setFormOpen(true); }} className="btn btn-primary btn-md">
              <Plus className="w-4 h-4" aria-hidden="true" /> Authorize Enrollment
            </button>
            <button type="button" onClick={load} className="btn btn-secondary btn-md">
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
            </button>
          </>
        }
      />
      <AttendanceTabs />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className={`${inputClass} !mb-0`}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="REVOKED">Revoked</option>
            <option value="REPLACED">Replaced</option>
          </select>
        </div>
        <span className="text-[12px] text-slate-500">
          Pending {counts.PENDING} · Active {counts.ACTIVE} · Revoked {counts.REVOKED}
        </span>
      </div>

      {notice && (
        <div className="mb-3 flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-800" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="ml-auto font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="masters-admin-alert masters-admin-alert--error" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={load} className="ml-auto font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="masters-admin-table-card" aria-busy="true" aria-label="Loading enrollments">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="cpd-skeleton-row">
              <div className="skeleton h-4 w-40 rounded" />
              <div className="skeleton h-4 w-28 rounded" />
              <div className="skeleton h-8 w-24 rounded" />
            </div>
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="masters-admin-empty">
          <div className="masters-admin-empty__icon">
            <Fingerprint className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-slate-600">No enrollments yet</p>
          <p className="mt-1 text-[13px] text-slate-500">
            Authorize an enrollment to let an employee register their face on a kiosk.
          </p>
        </div>
      ) : (
        <div className="masters-admin-table-card">
          <div className="masters-admin-table-wrap">
            <table className="data-table compact-table masters-admin-table w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Shop</th>
                  <th>Device</th>
                  <th>Status</th>
                  <th>Samples</th>
                  <th>Consent</th>
                  <th>Enrolled</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((en) => (
                  <tr key={en.id}>
                    <td>
                      <p className="masters-admin-row-name">{en.employee_name}</p>
                      <p className="masters-admin-row-sub">{en.employee_ref}</p>
                    </td>
                    <td>{en.shop_code}</td>
                    <td className="font-mono text-[12px]">{en.device_uid || "—"}</td>
                    <td>
                      <EnrollmentStatusBadge status={en.status} />
                    </td>
                    <td>{en.sample_count ?? 0}</td>
                    <td>{en.consent_recorded ? formatDateTime(en.consent_at) : "—"}</td>
                    <td>{en.enrolled_at ? formatDateTime(en.enrolled_at) : "—"}</td>
                    <td className="text-right">
                      {(en.status === "PENDING" || en.status === "ACTIVE") && (
                        <div className="cpd-row-actions">
                          <button
                            type="button"
                            className="cpd-action-btn"
                            onClick={() => {
                              setRevokeTarget(en);
                              setActionError(null);
                            }}
                            aria-label={`Revoke enrollment for ${en.employee_name}`}
                          >
                            <Ban className="w-3.5 h-3.5 text-red-500" aria-hidden="true" /> Revoke
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SlidePanel
        tone="masters"
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSaveError(null);
        }}
        title="Authorize Face Enrollment"
      >
        {saveError && (
          <div className="masters-admin-alert masters-admin-alert--error mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}
        <AuthorizeForm
          employees={employees}
          shops={shops}
          devices={devices}
          onSubmit={handleAuthorize}
          onCancel={() => {
            setFormOpen(false);
            setSaveError(null);
          }}
          loading={saving}
        />
        <p className="mt-4 text-[12px] text-slate-500 leading-relaxed">
          Authorizing replaces any existing pending or active enrollment for the
          same employee and device. The kiosk records the face samples
          on-device; this panel only manages authorization metadata.
        </p>
      </SlidePanel>

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke Enrollment"
        message={
          actionError ||
          `Revoke ${revokeTarget?.employee_name || "this employee"}'s enrollment? The kiosk must no longer authorize their face for attendance.`
        }
        onConfirm={handleRevoke}
        onCancel={() => {
          setRevokeTarget(null);
          setActionError(null);
        }}
        loading={acting}
        variant="danger"
        confirmLabel="Revoke"
      />
    </div>
  );
}
