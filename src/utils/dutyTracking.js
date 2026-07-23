/**
 * Canonical duty + tracking status for admin live tracking.
 *
 * Backend owns live health via tracking_status:
 *   ONLINE | STALE | OFFLINE | NO_LOCATION_YET
 *
 * Duty remains separate:
 *   duty_status / work_status: WORKING | STOPPED | AUTO_ENDED | ADMIN_ENDED | NO_WORKDAY
 *
 * Frontend must not recompute Online/Stale/Offline from Date.now() or timestamp age.
 * Tracking Offline does not mean duty ended.
 */

import { unwrapSuccessEnvelope, getResponseBody } from "./apiUnwrap.js";

export const DUTY_MOVING_SPEED_KMH = 1;

/** @deprecated Kept for import compatibility — no longer used for status classification. */
export const GPS_ONLINE_MAX_MINUTES = 7;
/** @deprecated Kept for import compatibility — no longer used for status classification. */
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

/**
 * Display-only location age in minutes (never used for Online/Stale/Offline).
 */
export function resolveLocationAgeMinutes(emp) {
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

/**
 * Backend tracking_status → internal key.
 * @returns {'gps_active'|'gps_stale'|'gps_offline'|'no_location'|'unknown'}
 */
export function resolveCanonicalTrackingStatusKey(emp) {
  const token = normalizeApiToken(
    emp?.tracking_status ?? emp?.live_tracking_status ?? emp?.connection_status
  );

  if (token === "ONLINE" || token === "GPS_ACTIVE" || token === "ACTIVE") {
    return "gps_active";
  }
  if (token === "STALE" || token === "GPS_STALE" || token === "GPS_DELAYED" || token === "DELAYED") {
    return "gps_stale";
  }
  if (
    token === "OFFLINE" ||
    token === "GPS_OFFLINE" ||
    token === "GPS_OFF" ||
    token === "GPS_LOST" ||
    token === "LOST"
  ) {
    return "gps_offline";
  }
  if (
    token === "NO_LOCATION_YET" ||
    token === "NO_LOCATION" ||
    token === "NEVER_SENT" ||
    token === "WAITING_FOR_GPS"
  ) {
    return "no_location";
  }

  // Legacy gps_status only when tracking_status is absent — still no age math.
  if (!token) {
    const gpsToken = normalizeApiToken(emp?.gps_status);
    if (gpsToken === "GPS_ACTIVE" || gpsToken === "ACTIVE") return "gps_active";
    if (gpsToken === "GPS_STALE" || gpsToken === "GPS_DELAYED") return "gps_stale";
    if (
      gpsToken === "GPS_OFFLINE" ||
      gpsToken === "GPS_OFF" ||
      gpsToken === "GPS_LOST"
    ) {
      return "gps_offline";
    }
  }

  if (import.meta.env?.DEV) {
    console.warn(
      "[live-tracking] tracking_status missing or unrecognized — showing Status unavailable",
      { tracking_status: emp?.tracking_status, gps_status: emp?.gps_status, userId: emp?.user_id ?? emp?.id }
    );
  }
  return "unknown";
}

/**
 * Live tracking health from backend tracking_status only — never from Date.now()/age.
 * @returns {'gps_active'|'gps_stale'|'gps_offline'|'no_location'|'unknown'}
 */
export function resolveCanonicalGpsStatusKey(emp) {
  return resolveCanonicalTrackingStatusKey(emp);
}

export function isNoLocationYet(emp) {
  return resolveCanonicalTrackingStatusKey(emp) === "no_location";
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

/** Marker / row dot color — duty first, tracking_status second */
export function getDutyStatusColor(emp) {
  const duty = resolveCanonicalDutyStatusKey(emp);
  if (duty !== "working") return "gray";

  const tracking = resolveCanonicalTrackingStatusKey(emp);
  if (tracking === "gps_active") return "green";
  if (tracking === "gps_stale") return "orange";
  if (tracking === "no_location") return "blue";
  if (tracking === "unknown") return "gray";
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
  no_location: "No Location Yet",
  unknown: "Status unavailable",
  gps_delayed: "Stale",
  gps_lost: "Offline",
  gps_off: "Offline",
};

export const CANONICAL_TRACKING_LABELS = CANONICAL_GPS_LABELS;

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

export function canonicalTrackingLabel(emp) {
  return CANONICAL_TRACKING_LABELS[resolveCanonicalTrackingStatusKey(emp)] ?? "Status unavailable";
}

export function canonicalGpsLabel(emp) {
  return canonicalTrackingLabel(emp);
}

/** Human-facing GPS hardware flag — not tracking Online/Offline. */
export function gpsHardwareLabel(emp) {
  if (emp?.gps_enabled === true) return "Enabled";
  if (emp?.gps_enabled === false) return "Disabled";
  return null;
}

export function permissionLabel(emp) {
  if (emp?.permission_granted === true) return "Allowed";
  if (emp?.permission_granted === false) return "Not allowed";
  return null;
}

export function trackingServiceLabel(emp) {
  if (emp?.tracking_service_active === true) return "Active";
  if (emp?.tracking_service_active === false) return "Stopped";
  return null;
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

/** User-facing tracking label for live roster */
export function liveLocationStatusLabel(emp) {
  return canonicalTrackingLabel(emp);
}

function formatRelativeFromIso(iso) {
  if (!iso) return null;
  const sec = secondsSince(iso);
  if (sec == null) return null;
  if (sec < 60) return `${sec} second${sec === 1 ? "" : "s"} ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 48) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Human-readable last GPS update from backend timestamps (display only). */
export function formatLastGpsUpdate(emp) {
  const iso =
    emp?.location_recorded_at ??
    emp?.last_gps_update ??
    emp?.last_update ??
    emp?.last_seen ??
    emp?.last_location_at ??
    null;

  const relative = formatRelativeFromIso(iso);
  if (relative) return relative;

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
    if (ageMin < 60) return `${ageMin} minute${ageMin === 1 ? "" : "s"} ago`;
    const hrs = Math.floor(ageMin / 60);
    return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  }

  return null;
}

/** Human-readable last heartbeat time (display only). */
export function formatLastHeartbeat(emp) {
  const iso = emp?.last_heartbeat_at ?? emp?.last_heartbeat ?? null;
  return formatRelativeFromIso(iso);
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

  // Keep last valid coords for map even when tracking is Stale/Offline — never invent fakes.
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
  // Age fields are display-only; status comes from tracking_status.
  const ageMin = resolveLocationAgeMinutes({
    ...emp,
    last_gps_update: lastGpsUpdate,
  });

  const dutyStatus = emp.duty_status ?? emp.work_status ?? null;
  const dutyKey = resolveCanonicalDutyStatusKey(emp);
  const isOnDuty = dutyKey === "working";
  const trackingStatus = emp.tracking_status ?? emp.live_tracking_status ?? null;

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
    tracking_status: trackingStatus,
    gps_status: emp.gps_status ?? null,
    gps_enabled: emp.gps_enabled,
    permission_granted: emp.permission_granted,
    tracking_service_active: emp.tracking_service_active,
    app_state: emp.app_state ?? null,
    network_available: emp.network_available,
    latest_accuracy: emp.latest_accuracy ?? emp.accuracy ?? null,
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
    accuracy:
      emp.latest_accuracy != null
        ? Number(emp.latest_accuracy)
        : emp.accuracy != null
          ? Number(emp.accuracy)
          : null,
    speed: emp.speed != null ? Number(emp.speed) : null,
    movement_status: resolveDutyMovementKey({ speed: emp.speed }),
  };

  return normalized;
}

/**
 * Merge newer live poll into prior employee row without regressing coordinates.
 * Prefer incoming when location_recorded_at is newer or coords newly appear.
 */
export function mergeLiveEmployeeUpdate(prev, next) {
  if (!next) return prev ?? null;
  if (!prev) return next;

  const prevId = String(prev.user_id ?? prev.id ?? "");
  const nextId = String(next.user_id ?? next.id ?? "");
  if (prevId && nextId && prevId !== nextId) return next;

  const prevTs = Date.parse(prev.location_recorded_at ?? prev.last_gps_update ?? "") || 0;
  const nextTs = Date.parse(next.location_recorded_at ?? next.last_gps_update ?? "") || 0;

  const nextHasCoords =
    Number.isFinite(Number(next.latitude)) && Number.isFinite(Number(next.longitude));
  const prevHasCoords =
    Number.isFinite(Number(prev.latitude)) && Number.isFinite(Number(prev.longitude));

  let latitude = next.latitude;
  let longitude = next.longitude;
  let location_recorded_at = next.location_recorded_at;

  if (prevHasCoords && nextHasCoords && nextTs < prevTs) {
    latitude = prev.latitude;
    longitude = prev.longitude;
    location_recorded_at = prev.location_recorded_at;
  } else if (prevHasCoords && !nextHasCoords) {
    latitude = prev.latitude;
    longitude = prev.longitude;
    location_recorded_at = prev.location_recorded_at ?? next.location_recorded_at;
  }

  return {
    ...prev,
    ...next,
    latitude,
    longitude,
    last_latitude: latitude,
    last_longitude: longitude,
    location_recorded_at,
    last_gps_update: location_recorded_at,
  };
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
