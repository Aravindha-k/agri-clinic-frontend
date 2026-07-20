import { Smartphone } from "lucide-react";
import {
  resolveDeviceStatus,
  deviceStatusLabel,
  resolveGpsLastUpdate,
  formatDeviceTimestamp,
  displayValue,
  hasAnyDeviceFields,
} from "../../utils/deviceStatus";

function InfoRow({ label, value, children }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children ?? (
        <span className="text-sm font-semibold text-slate-800 break-words">{value}</span>
      )}
    </div>
  );
}

/**
 * Device Information block for Live Tracking employee drawer (Summary tab).
 */
export default function EmployeeDeviceInfoSection({ employee, summary }) {
  const device = resolveDeviceStatus(employee, summary);
  const gpsLastUpdate = resolveGpsLastUpdate(employee, summary);
  const active = device.is_active;

  const rows = [
    { label: "Device Name", value: displayValue(device.device_name) },
    { label: "Device Model", value: displayValue(device.device_model) },
    { label: "Platform", value: displayValue(device.platform) },
    { label: "App Version", value: displayValue(device.app_version) },
    { label: "Last Login", value: formatDeviceTimestamp(device.last_login_at) },
    { label: "Last Seen", value: formatDeviceTimestamp(device.last_seen_at) },
    { label: "GPS Last Update", value: formatDeviceTimestamp(gpsLastUpdate) },
  ];

  return (
    <div className="tracking-drawer-device">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
        <Smartphone className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
        Device information
      </p>

      <InfoRow label="Device status">
        <span
          className={`inline-flex w-fit items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
            active
              ? "bg-emerald-50 text-emerald-800 border-emerald-100"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}
        >
          {deviceStatusLabel(active)}
        </span>
      </InfoRow>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rows.map((row) => (
          <InfoRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>

      {!hasAnyDeviceFields(device) ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 leading-relaxed">
          Device name and app details appear after the employee signs in on the mobile app with
          the latest version. GPS updates can still show without a device session.
        </p>
      ) : null}
    </div>
  );
}
