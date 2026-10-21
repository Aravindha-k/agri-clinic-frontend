import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/command";
import {
  RefreshCw,
  AlertCircle,
  Loader2,
  Plus,
  Edit3,
  Clock3,
  Trash2,
  MoonStar,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import AttendanceTabs from "../../components/attendance/AttendanceTabs";
import { ActiveBadge } from "../../components/attendance/AttendanceBadges";
import {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  getAttendanceShops,
} from "../../api/attendance.api";
import { attendanceErrorMessage, formatTimeOnly } from "../../utils/attendance";

const inputClass = "masters-admin-field";

function ShiftForm({ initial = {}, shops, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    shop: initial.shop ?? "",
    name: initial.name || "",
    start_time: initial.start_time ? String(initial.start_time).slice(0, 5) : "",
    end_time: initial.end_time ? String(initial.end_time).slice(0, 5) : "",
    grace_minutes: initial.grace_minutes ?? 15,
    is_active: initial.is_active !== false,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim() && form.start_time && form.end_time;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          ...form,
          shop: form.shop === "" ? null : Number(form.shop),
          grace_minutes: Number(form.grace_minutes) || 0,
        });
      }}
      className="masters-admin-form"
    >
      <div className={inputClass}>
        <label>Shop</label>
        <select value={form.shop} onChange={(e) => set("shop", e.target.value)}>
          <option value="">Global (all shops)</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className={inputClass}>
        <label>Shift Name *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Morning Shift"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={inputClass}>
          <label>Start Time *</label>
          <input
            type="time"
            required
            value={form.start_time}
            onChange={(e) => set("start_time", e.target.value)}
          />
        </div>
        <div className={inputClass}>
          <label>End Time *</label>
          <input
            type="time"
            required
            value={form.end_time}
            onChange={(e) => set("end_time", e.target.value)}
          />
        </div>
      </div>
      <div className={inputClass}>
        <label>Grace minutes</label>
        <input
          type="number"
          min="0"
          value={form.grace_minutes}
          onChange={(e) => set("grace_minutes", e.target.value)}
        />
      </div>
      {form.start_time && form.end_time && form.end_time <= form.start_time ? (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          This shift crosses midnight (end is earlier than start).
        </p>
      ) : null}
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
          {initial.id ? "Update" : "Create"} Shift
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

export default function AttendanceShifts() {
  const [shifts, setShifts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const shopName = useCallback(
    (id) => {
      if (id == null) return "Global";
      const s = shops.find((x) => x.id === id);
      return s ? `${s.code} — ${s.name}` : `#${id}`;
    },
    [shops]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [shiftPage, shopPage] = await Promise.all([
        getShifts(),
        getAttendanceShops(),
      ]);
      setShifts(shiftPage.results);
      setShops(shopPage.results);
    } catch (err) {
      setError(attendanceErrorMessage(err, "Failed to load shifts."));
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data) => {
    setSaveError(null);
    setSaving(true);
    try {
      if (editTarget?.id) {
        await updateShift(editTarget.id, data);
      } else {
        await createShift(data);
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
      await deleteShift(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(attendanceErrorMessage(err, "Delete failed. The shift may be in use."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="masters-admin page-container">
      <PageHeader
        title="Attendance Shifts"
        subtitle="Shift windows used for employee assignments"
        badge={
          <span className="masters-admin-header__badge">
            <Clock3 className="w-3 h-3" aria-hidden="true" />
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
              <Plus className="w-4 h-4" aria-hidden="true" /> Add Shift
            </button>
            <button type="button" onClick={load} className="btn btn-secondary btn-md">
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
            </button>
          </>
        }
      />
      <AttendanceTabs />

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
        <div className="masters-admin-table-card" aria-busy="true" aria-label="Loading shifts">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="cpd-skeleton-row">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-4 w-40 rounded" />
              <div className="skeleton h-8 w-24 rounded" />
            </div>
          ))}
        </div>
      ) : shifts.length === 0 ? (
        <div className="masters-admin-empty">
          <div className="masters-admin-empty__icon">
            <Clock3 className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-slate-600">No shifts configured yet</p>
        </div>
      ) : (
        <div className="masters-admin-table-card">
          <div className="masters-admin-table-wrap">
            <table className="data-table compact-table masters-admin-table w-full">
              <thead>
                <tr>
                  <th>Shift</th>
                  <th>Shop</th>
                  <th>Window</th>
                  <th>Grace</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="font-semibold">{s.name}</span>
                      {s.crosses_midnight ? (
                        <span
                          className="ml-2 inline-flex items-center gap-1 text-[11px] text-indigo-600 font-medium"
                          title="Overnight shift — ends after midnight"
                        >
                          <MoonStar className="w-3 h-3" aria-hidden="true" /> Overnight
                        </span>
                      ) : null}
                    </td>
                    <td>{shopName(s.shop)}</td>
                    <td>
                      {formatTimeOnly(s.start_time)} – {formatTimeOnly(s.end_time)}
                    </td>
                    <td>{s.grace_minutes} min</td>
                    <td>
                      <ActiveBadge active={s.is_active} />
                    </td>
                    <td className="text-right">
                      <div className="cpd-row-actions">
                        <button
                          type="button"
                          className="cpd-action-btn"
                          onClick={() => {
                            setEditTarget(s);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit shift ${s.name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                        </button>
                        <button
                          type="button"
                          className="cpd-action-btn"
                          onClick={() => {
                            setDeleteTarget(s);
                            setDeleteError(null);
                          }}
                          aria-label={`Delete shift ${s.name}`}
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
        title={editTarget ? "Edit Shift" : "Add Shift"}
      >
        {saveError && (
          <div className="masters-admin-alert masters-admin-alert--error mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}
        <ShiftForm
          initial={editTarget || {}}
          shops={shops.filter((s) => s.is_active)}
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
        title="Delete Shift"
        message={
          deleteError || `Delete shift "${deleteTarget?.name}"? Assignments using it will lose their shift.`
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
