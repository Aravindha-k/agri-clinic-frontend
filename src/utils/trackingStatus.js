/**
 * Admin tracking status labels — work, GPS online, movement.
 */

export function resolveWorkStatusKey(emp) {
  const detail = String(emp?.work_status_detail ?? "").toLowerCase().replace(/\s+/g, "_");
  if (detail === "working" || detail === "auto_ended" || detail === "stopped") {
    if (detail === "auto_ended") return "auto_ended";
    if (detail === "working") return "working";
    return "stopped";
  }

  const raw = String(emp?.work_status ?? "")
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (raw === "WORKING") return "working";
  if (raw === "AUTO_ENDED") return "auto_ended";
  return "stopped";
}

export function resolveGpsOnlineKey(emp) {
  const conn = String(emp?.connection ?? emp?.connection_status ?? "").toUpperCase();
  if (conn === "ONLINE") return "online";
  return "offline";
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

/** Marker / filter color bucket */
export function getTrackingStatusColor(emp) {
  const work = resolveWorkStatusKey(emp);
  const online = resolveGpsOnlineKey(emp);
  if (isGpsOff(emp) && work === "working") return "red";
  if (work === "working" && online === "online") return "green";
  if (work === "working" && online === "offline") return "yellow";
  return "gray";
}

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

export function workStatusLabel(emp) {
  return WORK_STATUS_LABELS[resolveWorkStatusKey(emp)] ?? "Stopped";
}

export function gpsOnlineLabel(emp) {
  return GPS_ONLINE_LABELS[resolveGpsOnlineKey(emp)] ?? "Offline";
}

export function movementLabel(emp) {
  return MOVEMENT_LABELS[resolveMovementKey(emp)] ?? "Stopped";
}
