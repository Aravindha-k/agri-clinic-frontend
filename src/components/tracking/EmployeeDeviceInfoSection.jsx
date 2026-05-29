import { Smartphone } from "lucide-react";
import {
  resolveDeviceStatus,
  deviceStatusLabel,
  resolveGpsLastUpdate,
  formatDeviceTimestamp,
  displayValue,
} from "../../utils/deviceStatus";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

function InfoRow({ label, value, children }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      {children ?? (
        <span className="text-sm font-medium text-gray-800 break-words">{value}</span>
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
    <div
      className="bg-white rounded-xl p-4 border border-gray-100 space-y-4"
      style={{ boxShadow: SHADOW }}
    >
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
        Device Information
      </p>

      <InfoRow label="Device Status">
        <span
          className={`inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            active
              ? "bg-emerald-100 text-emerald-800"
              : "bg-gray-100 text-gray-600"
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
    </div>
  );
}
