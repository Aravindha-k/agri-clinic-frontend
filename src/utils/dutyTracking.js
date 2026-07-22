/**
 * Canonical duty + GPS status for admin tracking (live map, drawer, routes).
 *
 * Backend fields (preferred):
 *   duty_status / work_status: WORKING | STOPPED | AUTO_ENDED | ADMIN_ENDED | NO_WORKDAY
 *     (also accepts ON_DUTY | OFF_DUTY | LOGGED_OUT)
 *   gps_status:  GPS_ACTIVE | GPS_DELAYED | GPS_LOST | GPS_OFF | GPS_STALE | GPS_OFFLINE
 *   last_gps_update, last_seen_minutes
 *
 * Falls back to legacy is_on_duty + age-based rules when new fields are absent.
 * GPS health is separate from duty status — GPS off does not mean duty ended.
 */

import { unwrapSuccessEnvelope, getResponseBody } from "./apiUnwrap";

export const DUTY_MOVING_SPEED_KMH = 1;

/**
 * Live GPS health from backend timestamps (mobile ~5 min updates).
 * Online ≤7 min · Stale 7–15 min · Offline >15 min or GPS disabled.
 */
export const GPS_ONLINE_MAX_MINUTES = 7;
export const GPS_STALE_MAX_MINUTES = 15;

const DUTY_API_TO_KEY = {
  WORKING: "working",
  ON_DUTY: "working",
  STOPPED: "stopped",
  OFF_DUTY: "stopped",
  AUTO_ENDED: "auto_ended",
  ADMIN_ENDED: "admin_ended",
  NO_WORKDAY: "no_workday",
  NOT_STARTED: "no_workday",
  LOGGED_OUT: "no_workday",
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

/**
 * @returns {'working'|'stopped'|'auto_ended'|'admin_ended'|'no_workday'}
 */
export function resolveCanonicalDutyStatusKey(emp) {
  const endReason = normalizeApiToken(emp?.end_reason ?? emp?.duty_end_reason);
  if (endReason === "ADMIN_ENDED" || endReason === "FORCE_ENDED" || endReason === "ADMIN") {
    return "admin_ended";
  }
  if (endReason === "AUTO_ENDED" || endReason === "AUTO") {
    return "auto_ended";
  }

  const fromApi = DUTY_API_TO_KEY[normalizeApiToken(emp?.duty_status)];
  if (fromApi) return fromApi;

  const work = DUTY_API_TO_KEY[normalizeApiToken(emp?.work_status ?? emp?.workday_status)];
  if (work) return work;

  if (emp?.is_on_duty === true) return "working";
  if (emp?.is_on_duty === false) {
    if (emp?.duty_session_id || emp?.workday_id) return "stopped";
    return "no_workday";
  }

  const legacy = String(emp?.workday_status ?? emp?.work_status ?? "").toLowerCase();
  if (legacy === "working") return "working";
  if (legacy === "auto_ended") return "auto_ended";
  if (legacy === "admin_ended") return "admin_ended";
  if (legacy === "ended" || legacy === "stopped") return "stopped";
  if (legacy === "not_started") return "no_workday";

  return "no_workday";
}

function resolveLocationAgeMinutes(emp) {
  if (emp?.last_seen_minutes != null && Number.isFinite(Number(emp.last_seen_minutes))) {
    return Number(emp.last_seen_minutes);
  }
  if (emp?.last_update_age_minutes != null && Number.isFinite(Number(emp.last_update_age_minutes))) {
    return Number(emp.last_update_age_minutes);
  }
  if (emp?.last_location_age_minutes != null && Number.isFinite(Number(emp.last_location_age_minutes))) {
    return Number(emp.last_location_age_minutes);
  }
  return minutesSince(
    emp?.location_recorded_at ??
      emp?.last_gps_update ??
      emp?.last_location_at ??
      emp?.last_update ??
      emp?.last_seen
  );
}

function resolveLegacyGpsStatusKey(emp) {
  const gpsDisabled =
    emp?.gps_enabled === false ||
    emp?.permission_granted === false ||
    normalizeApiToken(emp?.gps_signal) === "GPS_OFF" ||
    normalizeApiToken(emp?.legacy_gps_status) === "GPS_OFF";

  if (gpsDisabled) return "gps_offline";
  if (!hasValidCoords(emp)) return "gps_offline";

  const ageMin = resolveLocationAgeMinutes(emp);
  if (ageMin == null) return "gps_offline";
  if (ageMin <= GPS_ONLINE_MAX_MINUTES) return "gps_active";
  if (ageMin <= GPS_STALE_MAX_MINUTES) return "gps_stale";
  return "gps_offline";
}

/**
 * GPS health from backend timestamps (preferred) — separate from duty status.
 * @returns {'gps_active'|'gps_stale'|'gps_offline'}
 */
export function resolveCanonicalGpsStatusKey(emp) {
  const gpsDisabled =
    emp?.gps_enabled === false ||
    emp?.permission_granted === false;
  if (gpsDisabled) return "gps_offline";

  const apiToken = normalizeApiToken(emp?.gps_status);
  if (apiToken === "GPS_OFF" || apiToken === "GPS_OFFLINE") return "gps_offline";

  // Timestamp thresholds are authoritative for Online / Stale / Offline.
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

/** Marker / row dot color — duty first, GPS health second */
export function getDutyStatusColor(emp) {
  const duty = resolveCanonicalDutyStatusKey(emp);
  if (duty !== "working") return "gray";

  const gps = resolveCanonicalGpsStatusKey(emp);
  if (gps === "gps_active") return "green";
  if (gps === "gps_stale") return "orange";
  return "slate";
}

export const CANONICAL_DUTY_LABELS = {
  working: "Working",
  stopped: "Stopped",
  auto_ended: "Auto Ended",
  admin_ended: "Admin Ended",
  no_workday: "No Workday",
};

export const CANONICAL_GPS_LABELS = {
  gps_active: "Online",
  gps_stale: "Stale",
  gps_offline: "Offline",
  gps_delayed: "Stale",
  gps_lost: "Offline",
  gps_off: "Offline",
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
  return CANONICAL_DUTY_LABELS[resolveCanonicalDutyStatusKey(emp)] ?? "No Workday";
}

export function canonicalGpsLabel(emp) {
  return CANONICAL_GPS_LABELS[resolveCanonicalGpsStatusKey(emp)] ?? "Offline";
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

export function isOnDutyWorking(emp) {
  return resolveCanonicalDutyStatusKey(emp) === "working";
}

export function hasLiveMapLocation(emp) {
  const lat = Number(emp?.latitude);
  const lng = Number(emp?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

/** User-facing GPS/location label for live roster */
export function liveLocationStatusLabel(emp) {
  if (!hasLiveMapLocation(emp)) return "No Location Yet";
  return canonicalGpsLabel(emp);
}

/** Human-readable last GPS update: "10 sec ago", "2 min ago", "Never" */
export function formatLastGpsUpdate(emp) {
  const iso =
    emp?.location_recorded_at ??
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

/** Human-readable last heartbeat time */
export function formatLastHeartbeat(emp) {
  const iso = emp?.last_heartbeat_at ?? emp?.last_heartbeat ?? null;
  if (!iso) return null;
  const sec = secondsSince(iso);
  if (sec == null) return null;
  if (sec < 60) return `${sec} sec ago`;
  return `${Math.floor(sec / 60)} min ago`;
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

  // Keep last valid coords for map even when GPS is Stale/Offline — never invent fakes.
  const coordsValid = hasValidCoords(emp);
  const lat = coordsValid ? parseCoord(emp.latitude) : null;
  const lng = coordsValid ? parseCoord(emp.longitude) : null;
  const lastGpsUpdate =
    emp.location_recorded_at ??
    emp.last_gps_update ??
    emp.last_location_at ??
    emp.last_update ??
    emp.last_seen ??
    null;
  const lastHeartbeat =
    emp.last_heartbeat_at ?? emp.last_heartbeat ?? null;
  const ageMin = resolveLocationAgeMinutes({
    ...emp,
    last_gps_update: lastGpsUpdate,
  });

  const dutyStatus = emp.duty_status ?? emp.work_status ?? null;
  const dutyKey = resolveCanonicalDutyStatusKey(emp);
  const isOnDuty = dutyKey === "working";

  const nestedLoc =
    emp.last_location && typeof emp.last_location === "object"
      ? emp.last_location
      : emp.current_location && typeof emp.current_location === "object"
        ? emp.current_location
        : {};

  const normalized = {
    ...emp,
    user_id: emp.user_id ?? emp.employee_id ?? emp.id,
    employee_name: emp.employee_name ?? emp.name ?? emp.username,
    employee_code: emp.employee_code ?? emp.employee_id ?? emp.code ?? null,
    employee_id: emp.employee_id ?? emp.employee_code ?? emp.code ?? null,
    latitude: lat,
    longitude: lng,
    last_latitude: lat,
    last_longitude: lng,
    location_name:
      emp.location_name ?? nestedLoc.location_name ?? nestedLoc.name ?? null,
    area_name: emp.area_name ?? nestedLoc.area_name ?? null,
    formatted_address:
      emp.formatted_address ?? nestedLoc.formatted_address ?? nestedLoc.address ?? null,
    locality: emp.locality ?? nestedLoc.locality ?? nestedLoc.city ?? null,
    city: emp.city ?? nestedLoc.city ?? null,
    district: emp.district ?? emp.district_name ?? nestedLoc.district ?? null,
    state: emp.state ?? emp.state_name ?? nestedLoc.state ?? null,
    branch_name: emp.branch_name ?? nestedLoc.branch_name ?? null,
    duty_status: dutyStatus,
    gps_status: emp.gps_status ?? null,
    gps_enabled: emp.gps_enabled,
    permission_granted: emp.permission_granted,
    end_reason: emp.end_reason ?? emp.duty_end_reason ?? null,
    location_recorded_at: lastGpsUpdate,
    last_gps_update: lastGpsUpdate,
    last_heartbeat_at: lastHeartbeat,
    last_seen_minutes: ageMin,
    last_update: lastGpsUpdate,
    last_seen: lastGpsUpdate,
    last_location_at: lastGpsUpdate,
    last_update_age_minutes: ageMin,
    last_location_age_minutes: ageMin,
    is_on_duty: isOnDuty,
    duty_session_id: emp.duty_session_id ?? null,
    expected_end_at: emp.expected_end_at ?? null,
    started_at: emp.started_at ?? emp.duty_started_at ?? null,
    battery_level: emp.battery_level != null ? Number(emp.battery_level) : null,
    accuracy: emp.accuracy != null ? Number(emp.accuracy) : null,
    speed: emp.speed != null ? Number(emp.speed) : null,
    movement_status: resolveDutyMovementKey({ speed: emp.speed }),
  };

  return normalized;
}

/** Cache key for live tracking active roster */
export const LIVE_TRACKING_CACHE_KEY = "live-tracking:active-employees";

/** Build day-map cache key */
export function dayMapCacheKey({ employeeId, businessDate, dutySessionId }) {
  return `day-map:${employeeId ?? "none"}:${businessDate ?? "none"}:${dutySessionId ?? "nosession"}`;
}

/** Extract polyline [[lat,lng],...] from route API payload — unused by marker-only maps */
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

/** Deduplicate live roster by user id */
export function dedupeLiveEmployees(employees) {
  if (!Array.isArray(employees)) return [];
  const seen = new Set();
  const out = [];
  for (const emp of employees) {
    const id = String(emp?.user_id ?? emp?.id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(emp);
  }
  return out;
}
