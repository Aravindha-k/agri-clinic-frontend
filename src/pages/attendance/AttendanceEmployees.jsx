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
  transferAttendanceEmployee,
  getAttendanceShops,
} from "../../api/attendance.api";
import { attendanceErrorMessage } from "../../utils/attendance";

const inputClass = "masters-admin-field";

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
    </div>
  );
}
