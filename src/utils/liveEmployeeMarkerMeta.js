/**
 * Location label + Asia/Kolkata time helpers for live employee map markers.
 */

import { BUSINESS_TIME_ZONE, todayIsoDate } from "./businessDate";
import { asDisplayString, DISPLAY_FALLBACK } from "./displayValue";
import { getStoredMapLocationLabel } from "./mapLocationLabel";
import { formatCoordinates } from "./visitLocation";

export const LOCATION_UNAVAILABLE = "Location name unavailable";
export const COORDINATES_AVAILABLE = "Coordinates available";

function pickString(...values) {
  for (const v of values) {
    const s = asDisplayString(v, "");
    if (s && s !== DISPLAY_FALLBACK) return s;
  }
  return "";
}

/**
 * Flatten nested location bags the live API may send.
 * @param {object|null|undefined} emp
 * @returns {object}
 */
function locationFieldBag(emp) {
  if (!emp || typeof emp !== "object") return {};
  const nested = [
    emp.last_location,
    emp.current_location,
    emp.live_location,
    emp.location,
    emp.geo,
    emp.address,
  ].filter((v) => v && typeof v === "object" && !Array.isArray(v));

  return Object.assign({}, ...nested, emp);
}

/**
 * Backend area/address label for live tracking (no reverse geocode).
 * @param {object|null|undefined} emp
 * @returns {string|null}
 */
export function getLiveEmployeeLocationLabel(emp) {
  if (!emp || typeof emp !== "object") return null;

  const bag = locationFieldBag(emp);

  const primary = pickString(
    bag.location_name,
    bag.locationName,
    bag.area_name,
    bag.areaName,
    bag.formatted_address,
    bag.formattedAddress,
    bag.locality,
    bag.city,
    bag.city_name,
    bag.village_name,
    bag.village,
    bag.branch_name,
    bag.branch,
    bag.location_label,
    bag.locationLabel
  );

  const district = pickString(bag.district, bag.district_name);
  const state = pickString(bag.state, bag.state_name);

  if (primary) {
    const parts = [primary];
    if (state && !primary.toLowerCase().includes(state.toLowerCase())) {
      parts.push(state);
    } else if (
      district &&
      !primary.toLowerCase().includes(district.toLowerCase()) &&
      !state
    ) {
      parts.push(district);
    }
    return parts.join(", ");
  }

  if (district) {
    const districtLabel = /district$/i.test(district)
      ? district
      : `${district} District`;
    if (state && !districtLabel.toLowerCase().includes(state.toLowerCase())) {
      return `${districtLabel}, ${state}`;
    }
    return districtLabel;
  }

  if (state) return state;

  const stored = getStoredMapLocationLabel(bag) || getStoredMapLocationLabel(emp);
  return stored || null;
}

/**
 * Display model for popup/tooltip location section.
 * @param {object|null|undefined} emp
 * @param {number|null|undefined} lat
 * @param {number|null|undefined} lng
 * @param {string|null|undefined} [resolvedAddress] — cached reverse-geocode result
 * @returns {{ title: string, subtitle: string|null, hasAreaName: boolean }}
 */
export function resolveLiveLocationDisplay(emp, lat, lng, resolvedAddress = null) {
  const backend = getLiveEmployeeLocationLabel(emp);
  if (backend) {
    return { title: backend, subtitle: null, hasAreaName: true };
  }

  const geocoded = pickString(resolvedAddress);
  if (geocoded) {
    return { title: geocoded, subtitle: null, hasAreaName: true };
  }

  const coords = formatCoordinates(lat, lng);
  if (coords) {
    return {
      title: COORDINATES_AVAILABLE,
      subtitle: coords,
      hasAreaName: false,
    };
  }

  return {
    title: LOCATION_UNAVAILABLE,
    subtitle: null,
    hasAreaName: false,
  };
}

/**
 * Backend recorded GPS timestamp (not browser receive time).
 * @param {object|null|undefined} emp
 * @returns {string|null}
 */
export function getLiveGpsRecordedAt(emp) {
  if (!emp || typeof emp !== "object") return null;
  const bag = locationFieldBag(emp);
  const iso =
    emp.location_recorded_at ??
    emp.last_gps_update ??
    emp.last_location_at ??
    bag.recorded_at ??
    bag.location_recorded_at ??
    emp.last_update ??
    emp.last_seen ??
    null;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : String(iso);
}

/**
 * Exact time in Asia/Kolkata, e.g. "22 July 2026, 8:02 AM IST"
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
 * Compact exact IST, e.g. "22 Jul 2026, 8:02 AM IST"
 */
export function formatLiveExactIstCompact(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const formatted = d.toLocaleString("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${formatted} IST`;
}

/**
 * Relative time from backend timestamp.
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
  const yesterday = todayIsoDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  if (recordedDay === yesterday) return "Yesterday";

  const days = Math.floor(hrs / 24);
  if (days < 7) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  return formatLiveExactIstCompact(d) ?? `${days} days ago`;
}

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

export function buildLiveMarkerAriaLabel({ name, code, dutyLabel, gpsLabel, relative }) {
  const bits = [name];
  if (code) bits.push(String(code));
  if (dutyLabel) bits.push(String(dutyLabel));
  if (gpsLabel) bits.push(`GPS ${gpsLabel}`);
  if (relative) bits.push(`last updated ${relative}`);
  return bits.join(", ");
}
