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
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import AttendanceTabs from "../../components/attendance/AttendanceTabs";
import { ActiveBadge } from "../../components/attendance/AttendanceBadges";
import {
  getAttendanceEmployees,
  createAttendanceEmployee,
  updateAttendanceEmployee,
  activateAttendanceEmployee,
  deactivateAttendanceEmployee,
} from "../../api/attendance.api";
import { attendanceErrorMessage } from "../../utils/attendance";

const inputClass = "masters-admin-field";

function EmployeeForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    employee_code: initial.employee_code || "",
    full_name: initial.full_name || "",
    phone: initial.phone || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.employee_code.trim() && form.full_name.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
      className="masters-admin-form"
    >
      <div className={inputClass}>
        <label>Employee Code *</label>
        <input
          type="text"
          required
          value={form.employee_code}
          onChange={(e) => set("employee_code", e.target.value)}
          placeholder="e.g. SHOP-001"
          disabled={!!initial.id}
        />
      </div>
      <div className={inputClass}>
        <label>Full Name *</label>
        <input
          type="text"
          required
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          placeholder="e.g. Kumar Raja"
        />
      </div>
      <div className={inputClass}>
        <label>Phone</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="e.g. 98xxxxxx01"
        />
      </div>
      <p className="text-[12px] text-slate-500 leading-relaxed">
        Attendance-only identity — this does not create a login or grant Field Officer
        mobile access.
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await getAttendanceEmployees();
      setEmployees(page.results);
    } catch (err) {
      setError(attendanceErrorMessage(err, "Failed to load attendance employees."));
      setEmployees([]);
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
          phone: data.phone,
        });
      } else {
        await createAttendanceEmployee(data);
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
                  <th>Code</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Linked field officer</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="font-semibold">{e.employee_code}</td>
                    <td className="font-medium">{e.full_name}</td>
                    <td>{e.phone || "—"}</td>
                    <td className="text-slate-500">{e.linked_employee_id || "—"}</td>
                    <td>
                      <ActiveBadge active={e.is_active} />
                    </td>
                    <td className="text-right">
                      <div className="cpd-row-actions">
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
    </div>
  );
}
