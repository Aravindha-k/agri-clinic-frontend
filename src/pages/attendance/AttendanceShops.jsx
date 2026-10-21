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
import { attendanceErrorMessage } from "../../utils/attendance";

const inputClass = "masters-admin-field";

function ShopForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    code: initial.code || "",
    name: initial.name || "",
    address: initial.address || "",
    latitude: initial.latitude ?? "",
    longitude: initial.longitude ?? "",
    geofence_radius_m: initial.geofence_radius_m ?? 200,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.code.trim() && form.name.trim();

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      code: form.code.trim(),
      name: form.name.trim(),
      address: form.address,
      latitude: form.latitude === "" ? null : Number(form.latitude),
      longitude: form.longitude === "" ? null : Number(form.longitude),
      geofence_radius_m: Number(form.geofence_radius_m) || 200,
    });
  };

  return (
    <form onSubmit={submit} className="masters-admin-form">
      <div className={inputClass}>
        <label>Shop Code *</label>
        <input
          type="text"
          required
          value={form.code}
          onChange={(e) => set("code", e.target.value)}
          placeholder="e.g. LGD-01"
          disabled={!!initial.id}
        />
      </div>
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
        <label>Address</label>
        <textarea
          rows={2}
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Street, town, district"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={inputClass}>
          <label>Latitude</label>
          <input
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => set("latitude", e.target.value)}
            placeholder="10.87"
          />
        </div>
        <div className={inputClass}>
          <label>Longitude</label>
          <input
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) => set("longitude", e.target.value)}
            placeholder="78.81"
          />
        </div>
      </div>
      <div className={inputClass}>
        <label>Geofence radius (m)</label>
        <input
          type="number"
          min="0"
          value={form.geofence_radius_m}
          onChange={(e) => set("geofence_radius_m", e.target.value)}
        />
        <p className="text-[11.5px] text-slate-500 mt-1">Advisory only for kiosk check-ins.</p>
      </div>
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await getAttendanceShops();
      setShops(page.results);
    } catch (err) {
      setError(attendanceErrorMessage(err, "Failed to load shops."));
      setShops([]);
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
        const { code, ...rest } = data;
        await updateShop(editTarget.id, rest);
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
                  <th>Code</th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Geofence</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.code}</td>
                    <td className="font-medium">{s.name}</td>
                    <td>
                      {s.latitude != null && s.longitude != null ? (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                          {s.latitude}, {s.longitude}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td>{s.geofence_radius_m} m</td>
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
    </div>
  );
}
