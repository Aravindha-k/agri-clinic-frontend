/**
 * Canonical duty + GPS status for admin tracking (live map, drawer, routes).
 *
 * Backend fields (preferred):
 *   duty_status: ON_DUTY | OFF_DUTY | LOGGED_OUT
 *   gps_status:  GPS_ACTIVE | GPS_DELAYED | GPS_LOST | GPS_OFF
 *   last_gps_update, last_seen_minutes
 *
 * Falls back to legacy is_on_duty + age-based rules when new fields are absent.
 */

import { unwrapSuccessEnvelope, getResponseBody } from "./apiUnwrap";

export const DUTY_MOVING_SPEED_KMH = 1;

/** Legacy thresholds — used only when gps_status is missing */
const LEGACY_GPS_ACTIVE_MINUTES = 3;
const LEGACY_GPS_DELAYED_MINUTES = 10;

const GPS_API_TO_KEY = {
  GPS_ACTIVE: "gps_active",
  GPS_DELAYED: "gps_delayed",
  GPS_LOST: "gps_lost",
  GPS_OFF: "gps_off",
};

const DUTY_API_TO_KEY = {
  ON_DUTY: "on_duty",
  OFF_DUTY: "off_duty",
  LOGGED_OUT: "logged_out",
};

function parseCoord(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function minutesSince(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(Math.floor((Date.now() - t) / 60000), 0);
}

function secondsSince(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(Math.floor((Date.now() - t) / 1000), 0);
}

function isAccuracyInvalid(accuracy) {
  if (accuracy == null || accuracy === "") return true;
  const n = Number(accuracy);
  if (!Number.isFinite(n)) return true;
  if (n <= 0) return true;
  if (n > 5000) return true;
  return false;
}

function hasValidCoords(emp) {
  const lat = parseCoord(emp?.latitude);
  const lng = parseCoord(emp?.longitude);
  if (lat == null || lng == null) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return true;
}

function normalizeApiToken(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
}

/** @returns {'on_duty'|'off_duty'|'logged_out'} */
export function resolveCanonicalDutyStatusKey(emp) {
  const fromApi = DUTY_API_TO_KEY[normalizeApiToken(emp?.duty_status)];
  if (fromApi) return fromApi;

  if (emp?.is_on_duty === true) return "on_duty";
  if (emp?.is_on_duty === false) return "off_duty";

  const legacy = String(emp?.workday_status ?? emp?.work_status ?? "").toLowerCase();
  if (legacy === "working") return "on_duty";
  if (legacy === "ended") return "off_duty";

  return "off_duty";
}

function resolveLegacyGpsStatusKey(emp) {
  const gpsOff =
    emp?.gps_enabled === false ||
    normalizeApiToken(emp?.gps_signal) === "GPS_OFF" ||
    normalizeApiToken(emp?.legacy_gps_status) === "GPS_OFF";

  if (gpsOff || !hasValidCoords(emp) || isAccuracyInvalid(emp?.accuracy)) {
    return "gps_off";
  }

  const ageMin =
    emp?.last_seen_minutes != null
      ? Number(emp.last_seen_minutes)
      : emp?.last_update_age_minutes != null
        ? Number(emp.last_update_age_minutes)
        : minutesSince(
            emp?.last_gps_update ?? emp?.last_update ?? emp?.last_seen ?? emp?.last_location_at
          );

  if (ageMin == null) return "gps_off";
  if (ageMin <= LEGACY_GPS_ACTIVE_MINUTES) return "gps_active";
  if (ageMin <= LEGACY_GPS_DELAYED_MINUTES) return "gps_delayed";
  return "gps_lost";
}

/** @returns {'gps_active'|'gps_delayed'|'gps_lost'|'gps_off'} */
export function resolveCanonicalGpsStatusKey(emp) {
  const fromApi = GPS_API_TO_KEY[normalizeApiToken(emp?.gps_status)];
  if (fromApi) return fromApi;

  const legacyHealth = normalizeApiToken(emp?.tracking_health);
  if (legacyHealth === "OK") return "gps_active";
  if (legacyHealth === "STALE") return "gps_delayed";
  if (legacyHealth === "STOPPED") return "gps_lost";

  const conn = normalizeApiToken(emp?.connection);
  if (conn === "OFFLINE" && hasValidCoords(emp)) return "gps_lost";

  return resolveLegacyGpsStatusKey(emp);
}

/** @deprecated — use resolveCanonicalGpsStatusKey */
export function resolveDutyGpsStatusKey(emp) {
  return resolveCanonicalGpsStatusKey(emp);
}

/** @deprecated — use resolveCanonicalDutyStatusKey */
export function resolveDutyWorkdayKey(emp) {
  return resolveCanonicalDutyStatusKey(emp);
}

export function resolveDutyMovementKey(emp) {
  const speed = Number(emp?.speed);
  if (Number.isFinite(speed) && speed >= DUTY_MOVING_SPEED_KMH) return "moving";
  return "stopped";
}

/** Marker / row dot color */
export function getDutyStatusColor(emp) {
  const duty = resolveCanonicalDutyStatusKey(emp);
  if (duty !== "on_duty") return "gray";

  const gps = resolveCanonicalGpsStatusKey(emp);
  if (gps === "gps_active") return "green";
  if (gps === "gps_delayed") return "orange";
  if (gps === "gps_lost") return "red";
  return "slate";
}

export const CANONICAL_DUTY_LABELS = {
  on_duty: "On Duty",
  off_duty: "Off Duty",
  logged_out: "Logged Out",
};

export const CANONICAL_GPS_LABELS = {
  gps_active: "GPS Active",
  gps_delayed: "GPS Delayed",
  gps_lost: "GPS Lost",
  gps_off: "GPS Off",
};

export const DUTY_MOVEMENT_LABELS = {
  moving: "Moving",
  stopped: "Stopped",
};

/** @deprecated */
export const DUTY_GPS_STATUS_LABELS = CANONICAL_GPS_LABELS;
/** @deprecated */
export const DUTY_WORKDAY_LABELS = CANONICAL_DUTY_LABELS;

export function canonicalDutyLabel(emp) {
  return CANONICAL_DUTY_LABELS[resolveCanonicalDutyStatusKey(emp)] ?? "Off Duty";
}

export function canonicalGpsLabel(emp) {
  return CANONICAL_GPS_LABELS[resolveCanonicalGpsStatusKey(emp)] ?? "GPS Off";
}

/** @deprecated */
export function dutyGpsStatusLabel(emp) {
  return canonicalGpsLabel(emp);
}

/** @deprecated */
export function dutyWorkdayLabel(emp) {
  return canonicalDutyLabel(emp);
}

export function dutyMovementLabel(emp) {
  return DUTY_MOVEMENT_LABELS[resolveDutyMovementKey(emp)] ?? "Stopped";
}

export function isGpsActiveStatus(emp) {
  return resolveCanonicalGpsStatusKey(emp) === "gps_active";
}

/** Human-readable last GPS update: "10 sec ago", "2 min ago", "Never" */
export function formatLastGpsUpdate(emp) {
  const iso =
    emp?.last_gps_update ??
    emp?.last_update ??
    emp?.last_seen ??
    emp?.last_location_at ??
    null;

  if (iso) {
    const sec = secondsSince(iso);
    if (sec != null) {
      if (sec < 60) return `${sec} sec ago`;
      return `${Math.floor(sec / 60)} min ago`;
    }
  }

  const ageMin =
    emp?.last_seen_minutes != null
      ? Number(emp.last_seen_minutes)
      : emp?.last_update_age_minutes != null
        ? Number(emp.last_update_age_minutes)
        : emp?.last_location_age_minutes != null
          ? Number(emp.last_location_age_minutes)
          : null;

  if (ageMin != null && Number.isFinite(ageMin)) {
    if (ageMin < 1) return "Just now";
    return `${ageMin} min ago`;
  }

  return "Never";
}

/** @deprecated — use formatLastGpsUpdate */
export function formatDutyLastSeen(emp) {
  return formatLastGpsUpdate(emp);
}

export function resolveLiveEmployeeList(payload) {
  const raw = unwrapSuccessEnvelope(payload) ?? getResponseBody(payload) ?? payload;
  if (Array.isArray(raw?.employees)) return raw.employees;
  if (Array.isArray(raw)) return raw;
  return [];
}

export function normalizeLiveEmployee(emp) {
  if (!emp || typeof emp !== "object") return emp;

  const lat = parseCoord(emp.latitude);
  const lng = parseCoord(emp.longitude);
  const lastGpsUpdate =
    emp.last_gps_update ?? emp.last_update ?? emp.last_seen ?? null;
  const ageMin =
    emp.last_seen_minutes != null
      ? Number(emp.last_seen_minutes)
      : emp.last_update_age_minutes != null
        ? Number(emp.last_update_age_minutes)
        : minutesSince(lastGpsUpdate);

  const dutyStatus = emp.duty_status ?? null;
  const gpsStatus = emp.gps_status ?? null;
  const isOnDuty =
    emp.is_on_duty != null
      ? Boolean(emp.is_on_duty)
      : normalizeApiToken(dutyStatus) === "ON_DUTY";

  const normalized = {
    ...emp,
    user_id: emp.user_id ?? emp.id,
    employee_name: emp.employee_name ?? emp.username,
    latitude: lat,
    longitude: lng,
    last_latitude: lat,
    last_longitude: lng,
    duty_status: dutyStatus,
    gps_status: gpsStatus,
    last_gps_update: lastGpsUpdate,
    last_seen_minutes: ageMin,
    last_update: lastGpsUpdate,
    last_seen: lastGpsUpdate,
    last_location_at: lastGpsUpdate,
    last_update_age_minutes: ageMin,
    last_location_age_minutes: ageMin,
    is_on_duty: isOnDuty,
    duty_session_id: emp.duty_session_id ?? null,
    battery_level: emp.battery_level != null ? Number(emp.battery_level) : null,
    accuracy: emp.accuracy != null ? Number(emp.accuracy) : null,
    speed: emp.speed != null ? Number(emp.speed) : null,
    movement_status: resolveDutyMovementKey({ speed: emp.speed }),
  };

  return normalized;
}

/** Extract polyline [[lat,lng],...] from route API payload */
export function extractRoutePolyline(routeData) {
  const poly = routeData?.polyline;
  if (!Array.isArray(poly) || poly.length < 2) return [];
  return poly
    .map((pair) => {
      if (!Array.isArray(pair) || pair.length < 2) return null;
      const lat = parseCoord(pair[0]);
      const lng = parseCoord(pair[1]);
      if (lat == null || lng == null) return null;
      return [lat, lng];
    })
    .filter(Boolean);
}

/** Find one employee row from live tracking payload */
export function findLiveEmployee(liveEmployees, userId) {
  if (!userId || !Array.isArray(liveEmployees)) return null;
  return (
    liveEmployees.find((e) => String(e.user_id ?? e.id) === String(userId)) ?? null
  );
}
