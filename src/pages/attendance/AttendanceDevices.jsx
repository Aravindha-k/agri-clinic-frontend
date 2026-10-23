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
  RotateCcw,
  Pencil,
  Trash2,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import AttendanceTabs from "../../components/attendance/AttendanceTabs";
import { ActiveBadge } from "../../components/attendance/AttendanceBadges";
import DeviceTokenModal from "../../components/attendance/DeviceTokenModal";
import PairingCodeModal from "../../components/attendance/PairingCodeModal";
import {
  getDevices,
  createPairingCode,
  revokeDevice,
  restoreDevice,
  updateDevice,
  deleteDevice,
  rotateDeviceToken,
  getAttendanceShops,
} from "../../api/attendance.api";
import { attendanceErrorMessage, formatDateTime, DEVICE_TYPES, isDevicePaired } from "../../utils/attendance";

const inputClass = "masters-admin-field";
const PAIR_POLL_MS = 5000;

function DeviceForm({ shops, onSubmit, onCancel, loading }) {
  const [shop, setShop] = useState("");
  const valid = shop !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(Number(shop));
      }}
      className="masters-admin-form"
    >
      <div className={inputClass}>
        <label>Shop *</label>
        <select required value={shop} onChange={(e) => setShop(e.target.value)}>
          <option value="">Select shop…</option>
          {shops
            .filter((s) => s.is_active)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.area ? ` — ${s.area}` : ""}
              </option>
            ))}
        </select>
      </div>
      <p className="text-[12px] text-slate-500 leading-relaxed">
        A one-time 6-digit setup code is generated for this shop. Give it to
        the Android device operator — they enter it in the Attendance Kiosk
        App. No device ID or token needs to be copied manually.
      </p>
      <div className="masters-admin-form__foot">
        <button type="submit" disabled={loading || !valid} className="btn btn-primary btn-md">
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          Generate Setup Code
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
  const [pairing, setPairing] = useState(null);
  const [paired, setPaired] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [rotateTarget, setRotateTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);

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

  const handleGenerate = async (shopId) => {
    setSaveError(null);
    setSaving(true);
    try {
      const res = await createPairingCode(shopId);
      const shop = shops.find((s) => s.id === res?.shop_id || s.id === shopId);
      setFormOpen(false);
      setPairing({
        code: res?.pairing_code,
        expiresAt: res?.expires_at,
        deviceUid: res?.device_uid,
        shopCode: res?.shop_code,
        shopId: res?.shop_id ?? shopId,
        shopName: shop?.name,
      });
      setPaired(false);
      load();
    } catch (err) {
      setSaveError(attendanceErrorMessage(err, "Could not generate a setup code."));
    } finally {
      setSaving(false);
    }
  };

  // Poll the device list while a pairing code is active — when the kiosk
  // redeems the code the device turns active and we show success.
  useEffect(() => {
    if (!pairing?.deviceUid || paired) return undefined;
    const poll = async () => {
      try {
        const page = await getDevices();
        if (isDevicePaired(page.results, pairing.deviceUid)) {
          setPaired(true);
          setDevices(page.results);
        }
      } catch {
        /* transient poll failure — keep waiting */
      }
    };
    poll();
    const t = setInterval(poll, PAIR_POLL_MS);
    return () => clearInterval(t);
  }, [pairing?.deviceUid, paired]);

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

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setActionError(null);
    setActing(true);
    try {
      await restoreDevice(restoreTarget.id);
      setRestoreTarget(null);
      setNotice(`${restoreTarget.device_uid} restored.`);
      load();
    } catch (err) {
      setActionError(attendanceErrorMessage(err, "Restore failed."));
    } finally {
      setActing(false);
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    setActionError(null);
    setActing(true);
    try {
      await updateDevice(renameTarget.id, { name: renameValue.trim() });
      setRenameTarget(null);
      setNotice(`${renameTarget.device_uid} renamed.`);
      load();
    } catch (err) {
      setActionError(attendanceErrorMessage(err, "Rename failed."));
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    setActing(true);
    try {
      const res = await deleteDevice(deleteTarget.id);
      setDeleteTarget(null);
      setNotice(
        res?.permanently_deleted
          ? `${deleteTarget.device_uid} permanently deleted (no protected history).`
          : `${deleteTarget.device_uid} has attendance history — it was revoked instead of deleted.`
      );
      load();
    } catch (err) {
      setActionError(attendanceErrorMessage(err, "Delete failed."));
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
              <Plus className="w-4 h-4" aria-hidden="true" /> Add Device
            </button>
            <button type="button" onClick={load} className="btn btn-secondary btn-md">
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
            </button>
          </>
        }
      />
      <AttendanceTabs />

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
                      {d.revoked_at ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11.5px] font-semibold text-red-700">
                          Revoked
                        </span>
                      ) : d.is_active ? (
                        <ActiveBadge active={d.is_active} />
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11.5px] font-semibold text-amber-700">
                          Awaiting pairing
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="cpd-row-actions">
                        <button
                          type="button"
                          className="cpd-action-btn"
                          onClick={() => {
                            setRenameTarget(d);
                            setRenameValue(d.name || "");
                            setActionError(null);
                          }}
                          aria-label={`Rename ${d.device_uid}`}
                          title="Rename device"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Rename
                        </button>
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
                        {d.revoked_at ? (
                          <button
                            type="button"
                            className="cpd-action-btn"
                            onClick={() => {
                              setRestoreTarget(d);
                              setActionError(null);
                            }}
                            aria-label={`Restore ${d.device_uid}`}
                            title="Restore revoked device"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> Restore
                          </button>
                        ) : (
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
                        )}
                        <button
                          type="button"
                          className="cpd-action-btn"
                          onClick={() => {
                            setDeleteTarget(d);
                            setActionError(null);
                          }}
                          aria-label={`Delete ${d.device_uid}`}
                          title="Delete device (revokes if it has history)"
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
          setSaveError(null);
        }}
        title="Add Device — choose shop"
      >
        {saveError && (
          <div className="masters-admin-alert masters-admin-alert--error mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}
        <DeviceForm
          shops={shops}
          onSubmit={handleGenerate}
          onCancel={() => {
            setFormOpen(false);
            setSaveError(null);
          }}
          loading={saving}
        />
      </SlidePanel>

      <PairingCodeModal
        pairing={pairing}
        paired={paired}
        onRegenerate={pairing ? () => handleGenerate(pairing.shopId) : undefined}
        onClose={() => {
          setPairing(null);
          setPaired(false);
        }}
      />

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

      <ConfirmDialog
        open={!!restoreTarget}
        title="Restore Device"
        message={
          actionError ||
          `Restore ${restoreTarget?.device_uid}? Its existing credential starts working again immediately.`
        }
        onConfirm={handleRestore}
        onCancel={() => {
          setRestoreTarget(null);
          setActionError(null);
        }}
        loading={acting}
        variant="primary"
        confirmLabel="Restore"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Device"
        message={
          actionError ||
          `Delete ${deleteTarget?.device_uid}? If it has attendance history or enrollments it is revoked instead — history is never deleted.`
        }
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setActionError(null);
        }}
        loading={acting}
        variant="danger"
        confirmLabel="Delete"
      />

      <SlidePanel
        tone="masters"
        open={!!renameTarget}
        onClose={() => {
          setRenameTarget(null);
          setActionError(null);
        }}
        title={`Rename ${renameTarget?.device_uid || "device"}`}
      >
        {actionError && (
          <div className="masters-admin-alert masters-admin-alert--error mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        )}
        <form onSubmit={handleRename} className="masters-admin-form">
          <div className={inputClass}>
            <label>Display Name *</label>
            <input
              type="text"
              required
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="e.g. Lalgudi front-desk kiosk"
            />
          </div>
          <div className="masters-admin-form__foot">
            <button type="submit" disabled={acting || !renameValue.trim()} className="btn btn-primary btn-md">
              {acting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Save Name
            </button>
            <button
              type="button"
              onClick={() => {
                setRenameTarget(null);
                setActionError(null);
              }}
              className="btn btn-secondary btn-md"
            >
              Cancel
            </button>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
