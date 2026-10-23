/**
 * Attendance admin display helpers — pure functions (unit-testable).
 */

export const VERIFICATION_METHODS = {
  TEST_MANUAL: "Test / manual",
  BIOMETRIC: "Biometric verified",
  ADMIN_ADJUST: "Admin adjustment",
};

export const ATTENDANCE_STATUSES = {
  PRESENT: "Present",
  HALF_DAY: "Half day",
  INCOMPLETE: "Incomplete",
};

export const DEVICE_TYPES = {
  KIOSK: "Kiosk / test-mode tablet",
  BIOMETRIC: "Biometric scanner",
};

/** "7h 23m" from a worked_seconds value; "0m" for 0; "—" for null. */
export function formatWorkedSeconds(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) return "—";
  const total = Math.max(0, Math.floor(Number(seconds)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** "21 Oct 2026, 09:14" from an ISO timestamp; "—" for null. */
export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatTimeOnly(value) {
  if (!value) return "—";
  // Time fields may arrive as "HH:MM:SS" from DRF TimeField.
  if (typeof value === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const [h, m] = value.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatDateOnly(value) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function verificationLabel(method) {
  return VERIFICATION_METHODS[method] || method || "—";
}

export function statusLabel(status) {
  return ATTENDANCE_STATUSES[status] || status || "—";
}

/** Local YYYY-MM-DD for date input defaults. */
export function todayLocalISODate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Normalize a backend error into a single human-readable string. */
export function attendanceErrorMessage(err, fallback = "Request failed. Please try again.") {
  const data = err?.response?.data;
  if (!data) return err?.message && !err?.response ? "Network error — is the API reachable?" : fallback;
  if (typeof data === "string") return data;
  if (data.message) return data.message;
  if (data.detail) return data.detail;
  const parts = Object.values(data.errors || data)
    .flat()
    .filter((v) => typeof v === "string");
  return parts.length ? parts.join(" ") : fallback;
}

/**
 * Aggregate daily summary rows into per-shop totals for the dashboard cards.
 * Returns [{ shop_code, present, halfDay, incomplete, openSessions, workedSeconds, testRows }]
 */
export function aggregateByShop(rows = []) {
  const map = new Map();
  for (const r of rows) {
    const key = r.shop_code || "—";
    if (!map.has(key)) {
      map.set(key, {
        shop_code: key,
        present: 0,
        halfDay: 0,
        incomplete: 0,
        openSessions: 0,
        workedSeconds: 0,
        testRows: 0,
      });
    }
    const agg = map.get(key);
    if (r.status === "PRESENT") agg.present += 1;
    else if (r.status === "HALF_DAY") agg.halfDay += 1;
    else if (r.status === "INCOMPLETE") agg.incomplete += 1;
    if (r.has_open_session) agg.openSessions += 1;
    if (r.contains_test_events) agg.testRows += 1;
    agg.workedSeconds += Number(r.worked_seconds) || 0;
  }
  return [...map.values()].sort((a, b) => a.shop_code.localeCompare(b.shop_code));
}

/**
 * Seconds until a pairing code expires — 0 once expired, null if no expiry
 * supplied. Kept pure so the countdown logic is unit-testable.
 */
export function pairingSecondsLeft(expiresAt, nowMs = Date.now()) {
    if (!expiresAt) return null;
    const left = Math.floor((new Date(expiresAt).getTime() - nowMs) / 1000);
    return Number.isNaN(left) ? 0 : Math.max(0, left);
}

/** Display format for a pairing countdown, e.g. 305 → "5:05". */
export function formatPairingCountdown(secondsLeft) {
    if (secondsLeft == null) return "";
    const mm = Math.floor(secondsLeft / 60);
    const ss = String(secondsLeft % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

/** True when a redeemed (now-active) device matches the issued device_uid. */
export function isDevicePaired(devices, deviceUid) {
    return Array.isArray(devices) && devices.some(
        (d) => d.device_uid === deviceUid && d.is_active === true
    );
}

/** Face-enrollment lifecycle statuses (backend FaceEnrollment model). */
export const ENROLLMENT_STATUSES = {
    PENDING: "Pending",
    ACTIVE: "Active",
    REVOKED: "Revoked",
    REPLACED: "Replaced",
    FAILED: "Failed",
    EXPIRED: "Expired",
    NONE: "Not enrolled",
};

/** Tailwind badge classes per enrollment status. */
export const ENROLLMENT_BADGE_CLASSES = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REVOKED: "bg-red-50 text-red-700 border-red-200",
    REPLACED: "bg-slate-50 text-slate-500 border-slate-200",
    FAILED: "bg-red-50 text-red-700 border-red-200",
    EXPIRED: "bg-slate-50 text-slate-500 border-slate-200",
    NONE: "bg-slate-50 text-slate-400 border-slate-200",
};

export function enrollmentStatusLabel(status) {
    return ENROLLMENT_STATUSES[status] || status || "—";
}

export function enrollmentBadgeClass(status) {
    return ENROLLMENT_BADGE_CLASSES[status] || ENROLLMENT_BADGE_CLASSES.NONE;
}

/** True when a device is usable for new pairing/enrollment (not revoked). */
export function deviceAvailable(device) {
    return !!device && device.is_active === true && !device.revoked_at;
}

/** Device lifecycle: REVOKED → paired (active credential) → awaiting setup. */
export function deviceLifecycleState(d) {
    if (!d) return "UNKNOWN";
    if (d.revoked_at) return "REVOKED";
    return d.is_active ? "PAIRED" : "AWAITING";
}

/** Authoritative display name for a device = its shop's name. */
export function deviceShopName(d, shopsById = {}) {
    return d?.shop_name || shopsById[d?.shop]?.name || d?.shop_code || "—";
}

/** Custom nickname — the auto-generated "Kiosk @ …" default is not one. */
export function deviceNickname(d) {
    const n = (d?.name || "").trim();
    if (!n || n.startsWith("Kiosk @")) return null;
    return n;
}
