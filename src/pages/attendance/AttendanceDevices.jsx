import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/command";
import {
  RefreshCw,
  AlertCircle,
  Loader2,
  Plus,
  MonitorSmartphone,
  Ban,
  KeyRound,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import AttendanceTabs from "../../components/attendance/AttendanceTabs";
import { ActiveBadge } from "../../components/attendance/AttendanceBadges";
import DeviceTokenModal from "../../components/attendance/DeviceTokenModal";
import {
  getDevices,
  registerDevice,
  revokeDevice,
  rotateDeviceToken,
  getAttendanceShops,
} from "../../api/attendance.api";
import { attendanceErrorMessage, formatDateTime, DEVICE_TYPES } from "../../utils/attendance";

const inputClass = "masters-admin-field";

function DeviceForm({ shops, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    shop: "",
    device_uid: "",
    name: "",
    device_type: "KIOSK",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.shop !== "" && form.device_uid.trim() && form.name.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ ...form, shop: Number(form.shop) });
      }}
      className="masters-admin-form"
    >
      <div className={inputClass}>
        <label>Shop *</label>
        <select required value={form.shop} onChange={(e) => set("shop", e.target.value)}>
          <option value="">Select shop…</option>
          {shops
            .filter((s) => s.is_active)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
        </select>
      </div>
      <div className={inputClass}>
        <label>Device UID *</label>
        <input
          type="text"
          required
          value={form.device_uid}
          onChange={(e) => set("device_uid", e.target.value)}
          placeholder="e.g. KIOSK-LGD-01"
        />
        <p className="text-[11.5px] text-slate-500 mt-1">
          Public identifier the device sends in its X-Device-Id header.
        </p>
      </div>
      <div className={inputClass}>
        <label>Display Name *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Lalgudi front-desk kiosk"
        />
      </div>
      <div className={inputClass}>
        <label>Device Type</label>
        <select value={form.device_type} onChange={(e) => set("device_type", e.target.value)}>
          {Object.entries(DEVICE_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {form.device_type === "BIOMETRIC" && (
          <p className="text-[11.5px] text-amber-700 mt-1">
            Biometric verification is not yet integrated — events will still be
            recorded as test / manual until scanner integration ships.
          </p>
        )}
      </div>
      <p className="text-[12px] text-slate-500 leading-relaxed">
        A credential token is issued on registration and shown only once — store it
        on the device immediately.
      </p>
      <div className="masters-admin-form__foot">
        <button type="submit" disabled={loading || !valid} className="btn btn-primary btn-md">
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          Register Device
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

export default function AttendanceDevices() {
  const [devices, setDevices] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [issuedToken, setIssuedToken] = useState(null);
  const [issuedName, setIssuedName] = useState("");
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [rotateTarget, setRotateTarget] = useState(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, s] = await Promise.all([getDevices(), getAttendanceShops()]);
      setDevices(d.results);
      setShops(s.results);
    } catch (err) {
      setError(attendanceErrorMessage(err, "Failed to load devices."));
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRegister = async (data) => {
    setSaveError(null);
    setSaving(true);
    try {
      const res = await registerDevice(data);
      setFormOpen(false);
      setIssuedToken(res?.token || null);
      setIssuedName(res?.device?.name || data.name);
      load();
    } catch (err) {
      setSaveError(attendanceErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setActionError(null);
    setActing(true);
    try {
      await revokeDevice(revokeTarget.id);
      setRevokeTarget(null);
      load();
    } catch (err) {
      setActionError(attendanceErrorMessage(err, "Revoke failed."));
    } finally {
      setActing(false);
    }
  };

  const handleRotate = async () => {
    if (!rotateTarget) return;
    setActionError(null);
    setActing(true);
    try {
      const res = await rotateDeviceToken(rotateTarget.id);
      setRotateTarget(null);
      setIssuedToken(res?.token || null);
      setIssuedName(res?.device?.name || rotateTarget.name);
      load();
    } catch (err) {
      setActionError(attendanceErrorMessage(err, "Token rotation failed."));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="masters-admin page-container">
      <PageHeader
        title="Attendance Devices"
        subtitle="Registered kiosks and (future) biometric scanners"
        badge={
          <span className="masters-admin-header__badge">
            <MonitorSmartphone className="w-3 h-3" aria-hidden="true" />
            Attendance
          </span>
        }
        actions={
          <>
            <button type="button" onClick={() => setFormOpen(true)} className="btn btn-primary btn-md">
              <Plus className="w-4 h-4" aria-hidden="true" /> Register Device
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
        <div className="masters-admin-table-card" aria-busy="true" aria-label="Loading devices">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="cpd-skeleton-row">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-4 w-28 rounded" />
              <div className="skeleton h-8 w-32 rounded" />
            </div>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="masters-admin-empty">
          <div className="masters-admin-empty__icon">
            <MonitorSmartphone className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-slate-600">No devices registered yet</p>
        </div>
      ) : (
        <div className="masters-admin-table-card">
          <div className="masters-admin-table-wrap">
            <table className="data-table compact-table masters-admin-table w-full">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Shop</th>
                  <th>Type</th>
                  <th>Token</th>
                  <th>Last seen</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <p className="masters-admin-row-name">{d.name}</p>
                      <p className="masters-admin-row-sub font-mono">{d.device_uid}</p>
                    </td>
                    <td>{d.shop_code}</td>
                    <td>{DEVICE_TYPES[d.device_type] || d.device_type}</td>
                    <td className="font-mono text-[12px] text-slate-500">
                      {d.token_prefix ? `${d.token_prefix}…` : "—"}
                    </td>
                    <td>{d.revoked_at ? `Revoked ${formatDateTime(d.revoked_at)}` : formatDateTime(d.last_seen_at)}</td>
                    <td>
                      <ActiveBadge active={d.is_active} />
                    </td>
                    <td className="text-right">
                      <div className="cpd-row-actions">
                        <button
                          type="button"
                          className="cpd-action-btn"
                          disabled={!d.is_active}
                          onClick={() => {
                            setRotateTarget(d);
                            setActionError(null);
                          }}
                          aria-label={`Rotate token for ${d.device_uid}`}
                          title="Rotate credential token"
                        >
                          <KeyRound className="w-3.5 h-3.5" aria-hidden="true" /> Rotate token
                        </button>
                        <button
                          type="button"
                          className="cpd-action-btn"
                          disabled={!d.is_active}
                          onClick={() => {
                            setRevokeTarget(d);
                            setActionError(null);
                          }}
                          aria-label={`Revoke ${d.device_uid}`}
                          title="Revoke device access"
                        >
                          <Ban className="w-3.5 h-3.5 text-red-500" aria-hidden="true" /> Revoke
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
          setSaveError(null);
        }}
        title="Register Attendance Device"
      >
        {saveError && (
          <div className="masters-admin-alert masters-admin-alert--error mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}
        <DeviceForm
          shops={shops}
          onSubmit={handleRegister}
          onCancel={() => {
            setFormOpen(false);
            setSaveError(null);
          }}
          loading={saving}
        />
      </SlidePanel>

      <DeviceTokenModal
        token={issuedToken}
        deviceName={issuedName}
        onClose={() => {
          setIssuedToken(null);
          setIssuedName("");
        }}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke Device"
        message={
          actionError ||
          `Revoke ${revokeTarget?.device_uid}? The device token stops working immediately and it can no longer submit attendance.`
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

      <ConfirmDialog
        open={!!rotateTarget}
        title="Rotate Device Token"
        message={
          actionError ||
          `Rotate the token for ${rotateTarget?.device_uid}? The current token stops working immediately; you must install the new token on the device.`
        }
        onConfirm={handleRotate}
        onCancel={() => {
          setRotateTarget(null);
          setActionError(null);
        }}
        loading={acting}
        variant="primary"
        confirmLabel="Rotate token"
      />
    </div>
  );
}
