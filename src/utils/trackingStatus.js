/**
 * Admin tracking status labels — derived from backend fields (no hardcoded per-employee state).
 */

const STALE_GPS_MINUTES = 5;

export function resolveWorkdayStatusKey(emp) {
  const api = String(emp?.workday_status ?? "").toLowerCase();
  if (api === "working" || api === "ended" || api === "not_started") return api;

  const detail = String(emp?.work_status_detail ?? "").toLowerCase();
  if (detail === "working") return "working";
  if (detail === "auto_ended") return "ended";

  const raw = String(emp?.work_status ?? "").toUpperCase();
  if (raw === "WORKING") return "working";
  if (raw === "AUTO_ENDED") return "ended";
  if (emp?.active_workday === true && raw === "WORKING") return "working";
  if (emp?.workday_id && emp?.active_workday === false) return "ended";
  return "not_started";
}

/** GPS location data freshness — online | offline | never_sent */
export function resolveGpsDataStatusKey(emp) {
  const api = String(emp?.gps_data_status ?? "").toLowerCase();
  if (api === "online" || api === "offline" || api === "never_sent") return api;

  const work = resolveWorkdayStatusKey(emp);
  const points = Number(emp?.total_points ?? emp?.total_points_today ?? 0);
  const lastAt = emp?.last_location_at ?? emp?.last_seen;

  if (work === "not_started" && points <= 0) return "never_sent";
  if (!lastAt) return points > 0 ? "offline" : "never_sent";

  const ageMin = emp?.last_location_age_minutes ?? minutesSince(lastAt);
  if (ageMin != null && ageMin <= STALE_GPS_MINUTES) return "online";
  return "offline";
}

/** Tracking task — tracking | stopped | permission_issue | unknown */
export function resolveTrackingTaskKey(emp) {
  const api = String(emp?.tracking_task_status ?? emp?.tracking_status ?? "").toLowerCase();
  if (api === "permission_issue" || api === "permission issue") return "permission_issue";
  if (api === "tracking" || api === "stopped" || api === "unknown") return api;
  if (api === "online") return "tracking";
  if (api === "offline") return "stopped";

  if (isGpsOff(emp) || String(emp?.permission_status ?? "").toLowerCase() === "gps_off") {
    return "permission_issue";
  }
  const work = resolveWorkdayStatusKey(emp);
  if (work !== "working") return "stopped";
  const gps = resolveGpsDataStatusKey(emp);
  if (gps === "online") return "tracking";
  if (gps === "never_sent") return "stopped";
  return "unknown";
}

export function resolveGpsOnlineKey(emp) {
  return resolveGpsDataStatusKey(emp) === "online" ? "online" : "offline";
}

export function resolveMovementKey(emp) {
  const m = String(emp?.movement_status ?? "stopped").toLowerCase();
  if (m === "moving") return "moving";
  if (m === "idle") return "idle";
  return "stopped";
}

export function isGpsOff(emp) {
  const gps = String(emp?.gps_status ?? "").toUpperCase();
  return gps === "GPS_OFF" || gps === "OFF";
}

function minutesSince(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(Math.floor((Date.now() - t) / 60000), 0);
}

/**
 * Row / marker color bucket per tracking health rules.
 * green | orange | red | gray
 */
export function getTrackingStatusColor(emp) {
  const work = resolveWorkdayStatusKey(emp);
  if (work === "not_started") return "gray";
  if (work === "ended") return "gray";

  const task = resolveTrackingTaskKey(emp);
  const gps = resolveGpsDataStatusKey(emp);
  const points = Number(emp?.total_points ?? 0);

  if (task === "permission_issue" || (work === "working" && points <= 0 && gps === "never_sent")) {
    return "red";
  }
  if (gps === "online" && task === "tracking") return "green";

  const ageMin = emp?.last_location_age_minutes ?? minutesSince(emp?.last_location_at ?? emp?.last_seen);
  if (ageMin != null && ageMin > STALE_GPS_MINUTES) return "orange";

  if (gps === "offline" || task === "stopped") return "orange";
  return "red";
}

/** @deprecated use getTrackingStatusColor — alias for map markers */
export const getTrackingRowColor = getTrackingStatusColor;

export const WORKDAY_STATUS_LABELS = {
  not_started: "Not Started",
  working: "Working",
  ended: "Ended",
};

export const GPS_DATA_STATUS_LABELS = {
  online: "Online",
  offline: "Offline",
  never_sent: "Never Sent",
};

export const TRACKING_TASK_LABELS = {
  tracking: "Tracking",
  stopped: "Stopped",
  permission_issue: "Permission Issue",
  unknown: "Unknown",
};

export const WORK_STATUS_LABELS = {
  working: "Working",
  stopped: "Stopped",
  auto_ended: "Auto Ended",
};

export const GPS_ONLINE_LABELS = {
  online: "Online",
  offline: "Offline",
};

export const MOVEMENT_LABELS = {
  moving: "Moving",
  idle: "Idle",
  stopped: "Stopped",
};

export function workdayStatusLabel(emp) {
  return WORKDAY_STATUS_LABELS[resolveWorkdayStatusKey(emp)] ?? "Not Started";
}

export function gpsDataStatusLabel(emp) {
  return GPS_DATA_STATUS_LABELS[resolveGpsDataStatusKey(emp)] ?? "Offline";
}

export function trackingTaskLabel(emp) {
  return TRACKING_TASK_LABELS[resolveTrackingTaskKey(emp)] ?? "Unknown";
}

export function workStatusLabel(emp) {
  return workdayStatusLabel(emp);
}

export function gpsOnlineLabel(emp) {
  return gpsDataStatusLabel(emp);
}

export function movementLabel(emp) {
  return MOVEMENT_LABELS[resolveMovementKey(emp)] ?? "Stopped";
}

export function formatLocationAge(emp) {
  const min = emp?.last_location_age_minutes ?? minutesSince(emp?.last_location_at ?? emp?.last_seen);
  if (min == null) return "—";
  if (min < 1) return "<1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatDistanceKm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} km`;
}
