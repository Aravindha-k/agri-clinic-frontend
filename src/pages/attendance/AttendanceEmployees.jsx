import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/command";
import {
  RefreshCw,
  AlertCircle,
  Loader2,
  Plus,
  Search,
  X,
  Edit3,
  UserCheck,
  UserX,
  Users,
  Fingerprint,
  History,
  LogIn,
  LogOut,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import AttendanceTabs from "../../components/attendance/AttendanceTabs";
import {
  getAttendanceEmployees,
  createAttendanceEmployee,
  updateAttendanceEmployee,
  activateAttendanceEmployee,
  deactivateAttendanceEmployee,
  transferAttendanceEmployee,
  getAttendanceShops,
  getEventReport,
} from "../../api/attendance.api";
import {
  ActiveBadge,
  VerificationBadge,
} from "../../components/attendance/AttendanceBadges";
import {
  attendanceErrorMessage,
  formatDateTime,
  formatTimeOnly,
} from "../../utils/attendance";

const inputClass = "masters-admin-field";

const ENROLLMENT_STYLES = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  REVOKED: "bg-red-50 text-red-700",
  REPLACED: "bg-slate-100 text-slate-600",
  NONE: "bg-slate-50 text-slate-400",
};

function EnrollmentBadge({ status }) {
  const s = status || "NONE";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${ENROLLMENT_STYLES[s] || ENROLLMENT_STYLES.NONE}`}
    >
      <Fingerprint className="w-3 h-3" aria-hidden="true" />
      {s === "NONE" ? "Not enrolled" : s.charAt(0) + s.slice(1).toLowerCase()}
    </span>
  );
}

function HistoryPanel({ employee, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!employee) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEventReport({ employee_id: employee.employee_code, include_test: true })
      .then((rows) => {
        if (!cancelled) setEvents(rows.slice(0, 100));
      })
      .catch((err) => {
        if (!cancelled)
          setError(attendanceErrorMessage(err, "Could not load attendance history."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employee]);

  return (
    <SlidePanel
      tone="masters"
      open={!!employee}
      onClose={onClose}
      title={`Attendance — ${employee?.full_name || ""}`}
    >
      {employee && (
        <p className="text-[12.5px] text-slate-500 mb-4">
          {employee.employee_code} · {employee.shop_name || "Unassigned"} · showing the
          most recent 100 events
        </p>
      )}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 text-[13px]">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading history…
        </div>
      ) : error ? (
        <div className="masters-admin-alert masters-admin-alert--error" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : events.length === 0 ? (
        <p className="text-[13px] text-slate-500">No attendance events recorded yet.</p>
      ) : (
        <table className="data-table compact-table masters-admin-table w-full">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Time</th>
              <th>Shop</th>
              <th>Verification</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>
                  {ev.event_type === "CHECK_IN" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <LogIn className="w-3.5 h-3.5" aria-hidden="true" /> In
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                      <LogOut className="w-3.5 h-3.5" aria-hidden="true" /> Out
                    </span>
                  )}
                </td>
                <td>{formatDateTime(ev.occurred_at).split(",")[0] || formatDateTime(ev.occurred_at)}</td>
                <td>{formatTimeOnly(ev.occurred_at)}</td>
                <td>{ev.shop_code}</td>
                <td>
                  <VerificationBadge method={ev.verification_method} isTest={ev.is_test_mode} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SlidePanel>
  );
}

function EmployeeForm({ initial = {}, shops, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    full_name: initial.full_name || "",
    shop: initial.shop_id ?? "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.full_name.trim() && form.shop !== "";
  const shopChanged = !!initial.id && Number(form.shop) !== initial.shop_id;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
      className="masters-admin-form"
    >
      <div className={inputClass}>
        <label>Employee Name *</label>
        <input
          type="text"
          required
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          placeholder="e.g. Kumar Raja"
        />
      </div>
      <div className={inputClass}>
        <label>Assign to Shop *</label>
        <select
          required
          value={form.shop}
          onChange={(e) => set("shop", e.target.value)}
        >
          <option value="">Select shop…</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id} disabled={!s.is_active && s.id !== initial.shop_id}>
              {s.name}
              {s.area ? ` — ${s.area}` : ""}
              {s.is_active ? "" : " (inactive)"}
            </option>
          ))}
        </select>
      </div>
      {shopChanged ? (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Saving will transfer this employee to the selected shop. Attendance
          history is preserved.
        </p>
      ) : null}
      <p className="text-[12px] text-slate-500 leading-relaxed">
        Employee codes are generated automatically. This identity has no login
        and no Field Officer mobile access.
      </p>
      <div className="masters-admin-form__foot">
        <button type="submit" disabled={loading || !valid} className="btn btn-primary btn-md">
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {initial.id ? "Update" : "Create"} Employee
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

export default function AttendanceEmployees() {
  const [employees, setEmployees] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empPage, shopPage] = await Promise.all([
        getAttendanceEmployees(),
        getAttendanceShops(),
      ]);
      setEmployees(empPage.results);
      setShops(shopPage.results);
    } catch (err) {
      setError(attendanceErrorMessage(err, "Failed to load attendance employees."));
      setEmployees([]);
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (!showInactive && !e.is_active) return false;
      if (!q) return true;
      return [e.employee_code, e.full_name, e.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [employees, search, showInactive]);

  const handleSave = async (data) => {
    setSaveError(null);
    setSaving(true);
    try {
      if (editTarget?.id) {
        await updateAttendanceEmployee(editTarget.id, {
          full_name: data.full_name,
        });
        if (Number(data.shop) !== editTarget.shop_id) {
          await transferAttendanceEmployee(editTarget.id, Number(data.shop));
        }
      } else {
        await createAttendanceEmployee({
          full_name: data.full_name,
          shop: Number(data.shop),
        });
      }
      setFormOpen(false);
      setEditTarget(null);
      load();
    } catch (err) {
      setSaveError(attendanceErrorMessage(err, "Save failed. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setToggleError(null);
    setToggling(true);
    try {
      if (toggleTarget.is_active) {
        await deactivateAttendanceEmployee(toggleTarget.id);
      } else {
        await activateAttendanceEmployee(toggleTarget.id);
      }
      setToggleTarget(null);
      load();
    } catch (err) {
      setToggleError(attendanceErrorMessage(err, "Status change failed."));
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="masters-admin page-container">
      <PageHeader
        title="Attendance Employees"
        subtitle="Shop employees who check in/out at attendance kiosks"
        badge={
          <span className="masters-admin-header__badge">
            <Users className="w-3 h-3" aria-hidden="true" />
            Attendance
          </span>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setEditTarget(null);
                setFormOpen(true);
              }}
              className="btn btn-primary btn-md"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Add Employee
            </button>
            <button type="button" onClick={load} className="btn btn-secondary btn-md">
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
            </button>
          </>
        }
      />
      <AttendanceTabs />

      <section className="masters-admin-filters" aria-label="Search attendance employees">
        <div className="masters-admin-filters__row">
          <div className="masters-admin-search">
            <Search className="search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search code, name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              aria-label="Search attendance employees"
            />
          </div>
          <label className="masters-admin-check">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="btn btn-ghost btn-md filter-toolbar__clear"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear
            </button>
          )}
          <p className="masters-admin-filters__meta lg:ml-auto">{filtered.length} employees shown</p>
        </div>
      </section>

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
        <div className="masters-admin-table-card" aria-busy="true" aria-label="Loading employees">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="cpd-skeleton-row">
              <div className="skeleton h-4 w-28 rounded" />
              <div className="skeleton h-4 w-40 rounded" />
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-8 w-24 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="masters-admin-empty">
          <div className="masters-admin-empty__icon">
            <Users className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-slate-600">No attendance employees found</p>
        </div>
      ) : (
        <div className="masters-admin-table-card">
          <div className="masters-admin-table-wrap">
            <table className="data-table compact-table masters-admin-table w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Shop</th>
                  <th>Face enrollment</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <p className="masters-admin-row-name">{e.full_name}</p>
                      <p className="masters-admin-row-sub">{e.employee_code}</p>
                    </td>
                    <td>
                      {e.shop_name ? (
                        <span>
                          {e.shop_name}
                          <span className="text-slate-400 text-[11.5px]"> ({e.shop_code})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td>
                      <EnrollmentBadge status={e.enrollment_status} />
                    </td>
                    <td>
                      <ActiveBadge active={e.is_active} />
                    </td>
                    <td className="text-right">
                      <div className="cpd-row-actions">
                        <button
                          type="button"
                          className="cpd-action-btn"
                          onClick={() => setHistoryTarget(e)}
                          aria-label={`Attendance history for ${e.full_name}`}
                        >
                          <History className="w-3.5 h-3.5" aria-hidden="true" /> History
                        </button>
                        <button
                          type="button"
                          className="cpd-action-btn"
                          onClick={() => {
                            setEditTarget(e);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${e.full_name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                        </button>
                        <button
                          type="button"
                          className="cpd-action-btn"
                          onClick={() => {
                            setToggleTarget(e);
                            setToggleError(null);
                          }}
                          aria-label={`${e.is_active ? "Deactivate" : "Activate"} ${e.full_name}`}
                        >
                          {e.is_active ? (
                            <>
                              <UserX className="w-3.5 h-3.5 text-red-500" aria-hidden="true" /> Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> Activate
                            </>
                          )}
                        </button>
                      </div>
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
          setEditTarget(null);
          setSaveError(null);
        }}
        title={editTarget ? "Edit Attendance Employee" : "Add Attendance Employee"}
      >
        {saveError && (
          <div className="masters-admin-alert masters-admin-alert--error mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}
        <EmployeeForm
          initial={editTarget || {}}
          shops={shops}
          onSubmit={handleSave}
          onCancel={() => {
            setFormOpen(false);
            setEditTarget(null);
            setSaveError(null);
          }}
          loading={saving}
        />
      </SlidePanel>

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? "Deactivate Employee" : "Activate Employee"}
        message={
          toggleError ||
          (toggleTarget?.is_active
            ? `Deactivate ${toggleTarget?.full_name || "this employee"}? They will no longer be able to record attendance. History is preserved.`
            : `Activate ${toggleTarget?.full_name || "this employee"}?`)
        }
        onConfirm={handleToggle}
        onCancel={() => {
          setToggleTarget(null);
          setToggleError(null);
        }}
        loading={toggling}
        variant={toggleTarget?.is_active ? "danger" : "primary"}
        confirmLabel={toggleTarget?.is_active ? "Deactivate" : "Activate"}
      />

      <HistoryPanel employee={historyTarget} onClose={() => setHistoryTarget(null)} />
    </div>
  );
}
