/**
 * Location label + Asia/Kolkata time helpers for live employee map markers.
 * Uses backend-provided area fields only — no reverse geocode on poll.
 */

import { BUSINESS_TIME_ZONE, todayIsoDate } from "./businessDate";
import { asDisplayString, DISPLAY_FALLBACK } from "./displayValue";
import { getStoredMapLocationLabel } from "./mapLocationLabel";

const LOCATION_UNAVAILABLE = "Location name unavailable";

function pickString(...values) {
  for (const v of values) {
    const s = asDisplayString(v, "");
    if (s && s !== DISPLAY_FALLBACK) return s;
  }
  return "";
}

/**
 * Preferred area/address label for live tracking markers.
 * @param {object|null|undefined} emp
 * @returns {string}
 */
export function getLiveEmployeeLocationLabel(emp) {
  if (!emp || typeof emp !== "object") return LOCATION_UNAVAILABLE;

  const preferred = pickString(
    emp.location_name,
    emp.locationName,
    emp.area_name,
    emp.areaName,
    emp.formatted_address,
    emp.formattedAddress,
    emp.locality,
    emp.city,
    emp.district,
    emp.district_name,
    emp.branch_name,
    emp.branch,
    emp.location_label,
    emp.locationLabel
  );

  if (preferred) {
    const state = pickString(emp.state, emp.state_name);
    if (state && !preferred.toLowerCase().includes(state.toLowerCase())) {
      return `${preferred}, ${state}`;
    }
    return preferred;
  }

  const stored = getStoredMapLocationLabel(emp);
  return stored || LOCATION_UNAVAILABLE;
}

/**
 * Backend recorded GPS timestamp (not browser receive time).
 * @param {object|null|undefined} emp
 * @returns {string|null}
 */
export function getLiveGpsRecordedAt(emp) {
  if (!emp || typeof emp !== "object") return null;
  const iso =
    emp.location_recorded_at ??
    emp.last_gps_update ??
    emp.last_location_at ??
    emp.last_update ??
    emp.last_seen ??
    null;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : String(iso);
}

/**
 * Exact time in Asia/Kolkata, e.g. "22 July 2026, 8:02 AM IST"
 * @param {string|number|Date|null|undefined} value
 * @returns {string|null}
 */
export function formatLiveExactIst(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const formatted = d.toLocaleString("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${formatted} IST`;
}

/**
 * Relative time from backend timestamp.
 * @param {string|number|Date|null|undefined} value
 * @param {Date} [now]
 * @returns {string|null}
 */
export function formatLiveRelativeTime(value, now = new Date()) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const sec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  if (sec < 60) {
    return sec <= 1 ? "1 second ago" : `${sec} seconds ago`;
  }

  const min = Math.floor(sec / 60);
  if (min < 60) {
    return min === 1 ? "1 minute ago" : `${min} minutes ago`;
  }

  const hrs = Math.floor(min / 60);
  if (hrs < 24) {
    return hrs === 1 ? "1 hour ago" : `${hrs} hours ago`;
  }

  const recordedDay = todayIsoDate(d);
  const today = todayIsoDate(now);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterday = todayIsoDate(yesterdayDate);

  if (recordedDay === yesterday) return "Yesterday";

  const days = Math.floor(hrs / 24);
  if (days < 7) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  return formatLiveExactIst(d) ?? `${days} days ago`;
}

/**
 * GPS status colour class for tooltip/popup.
 * @param {string} gpsKey — resolveCanonicalGpsStatusKey result
 * @returns {string}
 */
export function liveGpsStatusToneClass(gpsKey) {
  switch (gpsKey) {
    case "gps_active":
      return "live-marker-gps--online";
    case "gps_stale":
      return "live-marker-gps--stale";
    case "gps_offline":
      return "live-marker-gps--offline";
    default:
      return "live-marker-gps--none";
  }
}

/**
 * Accessible marker label.
 * @param {{ name: string, code?: string|null, gpsLabel: string, relative?: string|null }} parts
 * @returns {string}
 */
export function buildLiveMarkerAriaLabel({ name, code, gpsLabel, relative }) {
  const bits = [name];
  if (code) bits.push(String(code));
  if (gpsLabel) bits.push(`GPS ${gpsLabel}`);
  if (relative) bits.push(`last updated ${relative}`);
  return bits.join(", ");
}

export { LOCATION_UNAVAILABLE };
