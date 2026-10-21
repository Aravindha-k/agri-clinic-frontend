import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/command";
import {
  RefreshCw,
  AlertCircle,
  Loader2,
  Plus,
  Edit3,
  Link2,
  Trash2,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import AttendanceTabs from "../../components/attendance/AttendanceTabs";
import { ActiveBadge } from "../../components/attendance/AttendanceBadges";
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAttendanceShops,
  getAttendanceEmployees,
  getShifts,
} from "../../api/attendance.api";
import { attendanceErrorMessage, formatDateOnly } from "../../utils/attendance";

const inputClass = "masters-admin-field";

function AssignmentForm({ initial = {}, employees, shops, shifts, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    employee: initial.employee ?? "",
    shop: initial.shop ?? "",
    shift: initial.shift ?? "",
    is_active: initial.is_active !== false,
    valid_from: initial.valid_from || "",
    valid_to: initial.valid_to || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.employee !== "" && form.shop !== "";

  const activeShops = shops.filter((s) => s.is_active || s.id === form.shop);
  const shopShifts = shifts.filter(
    (s) => s.is_active && (form.shop === "" || s.shop == null || s.shop === Number(form.shop))
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          employee: Number(form.employee),
          shop: Number(form.shop),
          shift: form.shift === "" ? null : Number(form.shift),
          is_active: form.is_active,
          valid_from: form.valid_from || null,
          valid_to: form.valid_to || null,
        });
      }}
      className="masters-admin-form"
    >
      <div className={inputClass}>
        <label>Employee *</label>
        <select required value={form.employee} onChange={(e) => set("employee", e.target.value)}>
          <option value="">Select employee…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id} disabled={!e.is_active}>
              {e.employee_code} — {e.full_name}
              {e.is_active ? "" : " (inactive)"}
            </option>
          ))}
        </select>
      </div>
      <div className={inputClass}>
        <label>Shop *</label>
        <select required value={form.shop} onChange={(e) => set("shop", e.target.value)}>
          <option value="">Select shop…</option>
          {activeShops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className={inputClass}>
        <label>Default Shift</label>
        <select value={form.shift} onChange={(e) => set("shift", e.target.value)}>
          <option value="">None</option>
          {shopShifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={inputClass}>
          <label>Valid From</label>
          <input
            type="date"
            value={form.valid_from}
            onChange={(e) => set("valid_from", e.target.value)}
          />
        </div>
        <div className={inputClass}>
          <label>Valid To</label>
          <input
            type="date"
            value={form.valid_to}
            onChange={(e) => set("valid_to", e.target.value)}
          />
        </div>
      </div>
      <label className="masters-admin-check">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => set("is_active", e.target.checked)}
        />
        Active
      </label>
      <div className="masters-admin-form__foot">
        <button type="submit" disabled={loading || !valid} className="btn btn-primary btn-md">
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {initial.id ? "Update" : "Create"} Assignment
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

/** Employee ↔ shop assignments with optional shift configuration. */
export default function AttendanceAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shops, setShops] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [shopFilter, setShopFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, e, s, sh] = await Promise.all([
        getAssignments(shopFilter ? { shop: shopFilter } : {}),
        getAttendanceEmployees(),
        getAttendanceShops(),
        getShifts(),
      ]);
      setAssignments(a.results);
      setEmployees(e.results);
      setShops(s.results);
      setShifts(sh.results);
    } catch (err) {
      setError(attendanceErrorMessage(err, "Failed to load assignments."));
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [shopFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data) => {
    setSaveError(null);
    setSaving(true);
    try {
      if (editTarget?.id) {
        await updateAssignment(editTarget.id, data);
      } else {
        await createAssignment(data);
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAssignment(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(attendanceErrorMessage(err, "Delete failed."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="masters-admin page-container">
      <PageHeader
        title="Shop Assignments"
        subtitle="Which attendance employees may check in at which shop, and their shift"
        badge={
          <span className="masters-admin-header__badge">
            <Link2 className="w-3 h-3" aria-hidden="true" />
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
              <Plus className="w-4 h-4" aria-hidden="true" /> Add Assignment
            </button>
            <button type="button" onClick={load} className="btn btn-secondary btn-md">
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
            </button>
          </>
        }
      />
      <AttendanceTabs />

      <section className="masters-admin-filters" aria-label="Filter assignments">
        <div className="masters-admin-filters__row">
          <div className="masters-admin-field">
            <label htmlFor="asg-shop">Shop</label>
            <select id="asg-shop" value={shopFilter} onChange={(e) => setShopFilter(e.target.value)}>
              <option value="">All shops</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <p className="masters-admin-filters__meta lg:ml-auto">{assignments.length} assignments</p>
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
        <div className="masters-admin-table-card" aria-busy="true" aria-label="Loading assignments">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="cpd-skeleton-row">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-4 w-28 rounded" />
              <div className="skeleton h-4 w-28 rounded" />
              <div className="skeleton h-8 w-24 rounded" />
            </div>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="masters-admin-empty">
          <div className="masters-admin-empty__icon">
            <Link2 className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-slate-600">No assignments yet</p>
        </div>
      ) : (
        <div className="masters-admin-table-card">
          <div className="masters-admin-table-wrap">
            <table className="data-table compact-table masters-admin-table w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Shop</th>
                  <th>Shift</th>
                  <th>Valid</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <p className="masters-admin-row-name">{a.employee_name || "—"}</p>
                      <p className="masters-admin-row-sub">{a.employee_ref}</p>
                    </td>
                    <td>{a.shop_code}</td>
                    <td>{a.shift_name || "—"}</td>
                    <td className="text-slate-500 text-[12.5px]">
                      {a.valid_from || a.valid_to
                        ? `${a.valid_from ? formatDateOnly(a.valid_from) : "…"} → ${a.valid_to ? formatDateOnly(a.valid_to) : "…"}`
                        : "Always"}
                    </td>
                    <td>
                      <ActiveBadge active={a.is_active} />
                    </td>
                    <td className="text-right">
                      <div className="cpd-row-actions">
                        <button
                          type="button"
                          className="cpd-action-btn"
                          onClick={() => {
                            setEditTarget(a);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit assignment for ${a.employee_ref}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                        </button>
                        <button
                          type="button"
                          className="cpd-action-btn"
                          onClick={() => {
                            setDeleteTarget(a);
                            setDeleteError(null);
                          }}
                          aria-label={`Delete assignment for ${a.employee_ref}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" aria-hidden="true" /> Delete
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
        title={editTarget ? "Edit Assignment" : "Add Assignment"}
      >
        {saveError && (
          <div className="masters-admin-alert masters-admin-alert--error mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}
        <AssignmentForm
          initial={editTarget || {}}
          employees={employees}
          shops={shops}
          shifts={shifts}
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
        open={!!deleteTarget}
        title="Delete Assignment"
        message={
          deleteError ||
          `Remove the assignment of ${deleteTarget?.employee_ref || "this employee"} to shop ${deleteTarget?.shop_code || ""}?`
        }
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        loading={deleting}
        variant="danger"
        confirmLabel="Delete"
      />
    </div>
  );
}
