import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/command";
import {
  RefreshCw,
  AlertCircle,
  Loader2,
  Plus,
  Edit3,
  Store,
  MapPin,
  Power,
  PowerOff,
  Archive,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import AttendanceTabs from "../../components/attendance/AttendanceTabs";
import { ActiveBadge } from "../../components/attendance/AttendanceBadges";
import {
  getAttendanceShops,
  createShop,
  updateShop,
} from "../../api/attendance.api";
import ShopLifecycleModal from "../../components/attendance/ShopLifecycleModal";
import { attendanceErrorMessage, formatDateTime } from "../../utils/attendance";

const inputClass = "masters-admin-field";

function ShopForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    name: initial.name || "",
    area: initial.area || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim() && form.area.trim();

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      name: form.name.trim(),
      area: form.area.trim(),
    });
  };

  return (
    <form onSubmit={submit} className="masters-admin-form">
      <div className={inputClass}>
        <label>Shop Name *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Lalgudi Main Branch"
        />
      </div>
      <div className={inputClass}>
        <label>Area / Location *</label>
        <input
          type="text"
          required
          value={form.area}
          onChange={(e) => set("area", e.target.value)}
          placeholder="e.g. Old Market, Lalgudi"
        />
      </div>
      <p className="text-[12px] text-slate-500 leading-relaxed">
        Shop codes, addresses and geofence settings are managed internally and
        are not required here.
      </p>
      <div className="masters-admin-form__foot">
        <button type="submit" disabled={loading || !valid} className="btn btn-primary btn-md">
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {initial.id ? "Update" : "Create"} Shop
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

export default function AttendanceShops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [lifecycleTarget, setLifecycleTarget] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await getAttendanceShops(
        includeArchived ? { include_archived: true } : {}
      );
      setShops(page.results);
    } catch (err) {
      setError(attendanceErrorMessage(err, "Failed to load shops."));
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data) => {
    setSaveError(null);
    setSaving(true);
    try {
      if (editTarget?.id) {
        await updateShop(editTarget.id, data);
      } else {
        await createShop(data);
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
      await updateShop(toggleTarget.id, { is_active: !toggleTarget.is_active });
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
        title="Attendance Shops"
        subtitle="Shop / clinic locations where attendance devices operate"
        badge={
          <span className="masters-admin-header__badge">
            <Store className="w-3 h-3" aria-hidden="true" />
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
              <Plus className="w-4 h-4" aria-hidden="true" /> Add Shop
            </button>
            <button type="button" onClick={load} className="btn btn-secondary btn-md">
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
            </button>
          </>
        }
      />
      <AttendanceTabs />

      <div className="mb-3 flex items-center gap-2">
        <label className="inline-flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show archived shops
        </label>
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
        <div className="masters-admin-table-card" aria-busy="true" aria-label="Loading shops">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="cpd-skeleton-row">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-4 w-40 rounded" />
              <div className="skeleton h-8 w-24 rounded" />
            </div>
          ))}
        </div>
      ) : shops.length === 0 ? (
        <div className="masters-admin-empty">
          <div className="masters-admin-empty__icon">
            <Store className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-slate-600">No shops registered yet</p>
        </div>
      ) : (
        <div className="masters-admin-table-card">
          <div className="masters-admin-table-wrap">
            <table className="data-table compact-table masters-admin-table w-full">
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Area / Location</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <p className="masters-admin-row-name">{s.name}</p>
                      <p className="masters-admin-row-sub">{s.code}</p>
                    </td>
                    <td>
                      {s.area ? (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                          {s.area}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td>
                      {s.archived_at ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600"
                          title={`Archived ${formatDateTime(s.archived_at)}${s.archive_reason ? ` — ${s.archive_reason}` : ""}`}
                        >
                          <Archive className="w-3 h-3" aria-hidden="true" /> Archived
                        </span>
                      ) : (
                        <ActiveBadge active={s.is_active} />
                      )}
                    </td>
                    <td className="text-right">
                      <div className="cpd-row-actions">
                        {!s.archived_at && (
                          <>
                            <button
                              type="button"
                              className="cpd-action-btn"
                              onClick={() => {
                                setEditTarget(s);
                                setFormOpen(true);
                              }}
                              aria-label={`Edit shop ${s.code}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                            </button>
                            <button
                              type="button"
                              className="cpd-action-btn"
                              onClick={() => {
                                setToggleTarget(s);
                                setToggleError(null);
                              }}
                              aria-label={`${s.is_active ? "Deactivate" : "Activate"} shop ${s.code}`}
                            >
                              {s.is_active ? (
                                <>
                                  <PowerOff className="w-3.5 h-3.5 text-red-500" aria-hidden="true" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> Activate
                                </>
                              )}
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="cpd-action-btn"
                          onClick={() => {
                            setLifecycleTarget(s);
                            setNotice(null);
                          }}
                          aria-label={`Archive or delete shop ${s.code}`}
                        >
                          <Archive className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" /> Archive / Delete
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
        title={editTarget ? "Edit Shop" : "Add Shop"}
      >
        {saveError && (
          <div className="masters-admin-alert masters-admin-alert--error mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}
        <ShopForm
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
        title={toggleTarget?.is_active ? "Deactivate Shop" : "Activate Shop"}
        message={
          toggleError ||
          (toggleTarget?.is_active
            ? `Deactivate shop ${toggleTarget?.code}? Devices at this shop will stop recording attendance.`
            : `Activate shop ${toggleTarget?.code}?`)
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

      {lifecycleTarget && (
        <ShopLifecycleModal
          shop={lifecycleTarget}
          onClose={() => setLifecycleTarget(null)}
          onDone={(_res, mode) => {
            setLifecycleTarget(null);
            setNotice(
              mode === "archive"
                ? `${lifecycleTarget.name} archived — attendance history preserved.`
                : `${lifecycleTarget.name} permanently deleted (it had no protected history).`
            );
            load();
          }}
        />
      )}
    </div>
  );
}
