/**
 * Admin-safe device_status from tracking APIs (no session tokens / hardware IDs).
 */

import { formatRouteTimestamp } from "./employeeRoute";

const SAFE_DEVICE_KEYS = new Set([
  "device_name",
  "device_model",
  "platform",
  "app_version",
  "last_login_at",
  "last_seen_at",
  "is_active",
]);

/** Strip sensitive or unknown fields from device_status blobs. */
export function sanitizeDeviceStatus(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      device_name: null,
      device_model: null,
      platform: null,
      app_version: null,
      last_login_at: null,
      last_seen_at: null,
      is_active: false,
    };
  }

  const out = {
    device_name: null,
    device_model: null,
    platform: null,
    app_version: null,
    last_login_at: null,
    last_seen_at: null,
    is_active: false,
  };

  for (const key of SAFE_DEVICE_KEYS) {
    if (key in raw && raw[key] !== undefined) {
      out[key] = raw[key];
    }
  }

  out.is_active = Boolean(out.is_active);
  return out;
}

export function resolveDeviceStatus(employee, summary) {
  const fromEmployee = employee?.device_status;
  const fromSummary = summary?.device_status;
  const raw =
    fromEmployee && typeof fromEmployee === "object"
      ? fromEmployee
      : fromSummary && typeof fromSummary === "object"
        ? fromSummary
        : {};
  return sanitizeDeviceStatus(raw);
}

export function deviceStatusLabel(isActive) {
  return isActive ? "Active" : "Not logged in";
}

/** Latest GPS fix from tracking row (not device session heartbeat). */
export function resolveGpsLastUpdate(employee, summary) {
  const candidates = [
    employee?.last_seen,
    summary?.last_seen,
    employee?.last_location?.recorded_at,
    summary?.last_location?.recorded_at,
    employee?.last_location_at,
    summary?.last_location_at,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c);
  }
  return null;
}

export function formatDeviceTimestamp(value) {
  return formatRouteTimestamp(value);
}

export function displayValue(value) {
  if (value == null || value === "") return "—";
  return String(value);
}
