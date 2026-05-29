/**
 * Admin-safe device_status from tracking APIs (no session tokens / hardware IDs).
 */

import { formatRouteTimestamp } from "./employeeRoute";
import { unwrapSuccessEnvelope, getResponseBody } from "./apiUnwrap";

const SAFE_DEVICE_KEYS = [
  "device_name",
  "device_model",
  "platform",
  "app_version",
  "last_login_at",
  "last_seen_at",
  "is_active",
];

const EMPTY_DEVICE = {
  device_name: null,
  device_model: null,
  platform: null,
  app_version: null,
  last_login_at: null,
  last_seen_at: null,
  is_active: false,
};

function hasText(value) {
  return value != null && String(value).trim() !== "";
}

/** Strip sensitive or unknown fields from device_status blobs. */
export function sanitizeDeviceStatus(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_DEVICE };
  }

  const out = { ...EMPTY_DEVICE };
  for (const key of SAFE_DEVICE_KEYS) {
    if (key in raw && raw[key] !== undefined && raw[key] !== "") {
      out[key] = key === "is_active" ? Boolean(raw[key]) : raw[key];
    }
  }
  return out;
}

/** Flat legacy fields sometimes present on tracking rows. */
function legacyDeviceFields(row) {
  if (!row || typeof row !== "object") return null;
  const hasAny =
    hasText(row.device_name) ||
    hasText(row.device_model) ||
    hasText(row.platform) ||
    hasText(row.app_version);
  if (!hasAny) return null;
  return {
    device_name: row.device_name ?? null,
    device_model: row.device_model ?? null,
    platform: row.platform ?? null,
    app_version: row.app_version ?? null,
    last_login_at: row.last_login_at ?? null,
    last_seen_at: row.last_seen_at ?? null,
    is_active: Boolean(row.is_active),
  };
}

/** Merge multiple partial device_status sources (richest wins). */
export function mergeDeviceStatus(...sources) {
  const merged = { ...EMPTY_DEVICE };
  let anyActive = false;

  for (const src of sources) {
    if (!src) continue;
    const s = sanitizeDeviceStatus(src);
    if (s.is_active) anyActive = true;
    for (const key of SAFE_DEVICE_KEYS) {
      if (key === "is_active") continue;
      if (hasText(s[key]) || s[key] != null) {
        if (!hasText(merged[key])) merged[key] = s[key];
      }
    }
  }

  merged.is_active = anyActive;
  return merged;
}

export function resolveDeviceStatus(employee, summary) {
  return mergeDeviceStatus(
    employee?.device_status,
    summary?.device_status,
    legacyDeviceFields(employee),
    legacyDeviceFields(summary)
  );
}

/** Unwrap summary API body (plain row or { success, data }). */
export function normalizeEmployeeSummaryResponse(payload) {
  const body = unwrapSuccessEnvelope(payload) ?? getResponseBody(payload) ?? payload;
  if (body && typeof body === "object" && body.device_status) {
    return body;
  }
  if (body?.data && typeof body.data === "object") {
    return body.data;
  }
  return body;
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

export function hasAnyDeviceFields(device) {
  if (!device) return false;
  return (
    device.is_active ||
    hasText(device.device_name) ||
    hasText(device.device_model) ||
    hasText(device.platform) ||
    hasText(device.app_version) ||
    hasText(device.last_login_at) ||
    hasText(device.last_seen_at)
  );
}
