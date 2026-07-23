/**
 * Last-valid map presentation snapshots — preserve markers across temporary failures.
 * No tokens or raw API payloads.
 */

const LIVE_KEY = "live-tracking:last-valid";
const memory = new Map();

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readSession(key) {
  if (typeof sessionStorage === "undefined") return memory.get(key) ?? null;
  const fromMem = memory.get(key);
  if (fromMem) return fromMem;
  const parsed = safeParse(sessionStorage.getItem(key));
  if (parsed) memory.set(key, parsed);
  return parsed;
}

function writeSession(key, value) {
  memory.set(key, value);
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

function removeSession(key) {
  memory.delete(key);
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** day-map:{employeeId}:{businessDate}:{dutySessionId} */
export function dayMapCacheKey({ employeeId, businessDate, dutySessionId } = {}) {
  return `day-map:${employeeId ?? "none"}:${businessDate ?? "none"}:${dutySessionId ?? "nosession"}`;
}

export function saveLiveTrackingSnapshot(employees) {
  if (!Array.isArray(employees) || employees.length === 0) return;
  const markers = employees
    .filter((e) => e && e.latitude != null && e.longitude != null)
    .map((e) => ({
      id: String(e.user_id ?? e.id),
      type: "live",
      latitude: Number(e.latitude),
      longitude: Number(e.longitude),
      timestamp: e.location_recorded_at ?? e.last_gps_update ?? null,
      dutySessionId: e.duty_session_id ?? null,
      dutyStatus: e.duty_status ?? null,
      trackingStatus: e.tracking_status ?? null,
      gpsStatus: e.gps_status ?? null,
      employeeName: e.employee_name ?? e.username ?? null,
      employeeCode: e.employee_code ?? e.employee_id ?? null,
    }))
    .filter((m) => Number.isFinite(m.latitude) && Number.isFinite(m.longitude));

  // Presentation-safe roster snapshot (no tokens). Keep full display fields for restore.
  const safeEmployees = employees.map((e) => ({
    ...e,
    access_token: undefined,
    refresh_token: undefined,
    token: undefined,
    authorization: undefined,
  }));

  writeSession(LIVE_KEY, {
    scope: LIVE_KEY,
    markers,
    employees: safeEmployees,
    fetchedAt: new Date().toISOString(),
  });
}

export function loadLiveTrackingSnapshot() {
  return readSession(LIVE_KEY);
}

export function clearLiveTrackingSnapshot() {
  removeSession(LIVE_KEY);
}

export function saveDayMapSnapshot(scopeKey, routeData) {
  if (!scopeKey || !routeData) return;
  const markers = Array.isArray(routeData.markers) ? routeData.markers : [];
  if (!markers.length) return;

  writeSession(scopeKey, {
    scope: scopeKey,
    markers: markers.map((m) => ({
      id: `${m.type}-${m.visitId ?? m.localSyncId ?? `${m.latitude},${m.longitude}`}`,
      type: m.type,
      latitude: m.latitude,
      longitude: m.longitude,
      timestamp: m.captured_at ?? null,
      visitId: m.visitId ?? null,
      localSyncId: m.localSyncId ?? null,
      label: m.label ?? null,
      endReason: m.endReason ?? null,
    })),
    routeData,
    fetchedAt: new Date().toISOString(),
  });
}

export function loadDayMapSnapshot(scopeKey) {
  if (!scopeKey) return null;
  return readSession(scopeKey);
}

export function clearDayMapSnapshot(scopeKey) {
  if (!scopeKey) return;
  removeSession(scopeKey);
}

/**
 * Classify whether an empty/null day-map payload is authoritative.
 */
export function isAuthoritativeDayMapEmpty(data) {
  if (data == null) return false;
  if (data.__authoritativeEmpty === true) return true;
  const markers = data.markers;
  if (!Array.isArray(markers)) return false;
  // Explicit empty markers array from a successful normalize is authoritative.
  return markers.length === 0 && (data.dutySessionId != null || data.date != null || data.userId != null || data.startTime == null);
}

export function clearAllAdminMapSnapshots() {
  clearLiveTrackingSnapshot();
  for (const key of [...memory.keys()]) {
    if (String(key).startsWith("day-map:")) removeSession(key);
  }
}
