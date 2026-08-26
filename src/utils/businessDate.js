/**
 * Asia/Kolkata business-date helpers — matches mobile/backend duty day boundaries.
 */

export const BUSINESS_TIME_ZONE = "Asia/Kolkata";

/** Alias used across admin formatters. */
export const INDIA_TIME_ZONE = BUSINESS_TIME_ZONE;

/**
 * Today's business date as YYYY-MM-DD in Asia/Kolkata.
 * @param {Date} [now]
 * @returns {string}
 */
export function todayIsoDate(now = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: BUSINESS_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    const d = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  }
}

function parseInstant(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Format an instant for admin UI in Asia/Kolkata.
 * @param {string|number|Date|null|undefined} value
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatBusinessDateTime(value, options = {}) {
  const d = parseInstant(value);
  if (!d) return value == null || value === "" ? "—" : String(value);
  return d.toLocaleString("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

/** @alias formatBusinessDateTime */
export function formatIndiaDateTime(value, options = {}) {
  return formatBusinessDateTime(value, options);
}

/**
 * Date portion in Asia/Kolkata.
 * @param {string|number|Date|null|undefined} value
 * @returns {string}
 */
export function formatIndiaDate(value) {
  const d = parseInstant(value);
  if (!d) return value == null || value === "" ? "—" : String(value);
  return d.toLocaleDateString("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Time portion in Asia/Kolkata.
 * @param {string|number|Date|null|undefined} value
 * @returns {string}
 */
export function formatIndiaTime(value) {
  const d = parseInstant(value);
  if (!d) return value == null || value === "" ? "—" : String(value);
  return d.toLocaleTimeString("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Backend stores visit_date + visit_time as UTC date/time parts from Django timezone.now().
 * Combine them into one UTC instant for display conversion.
 * @param {string|Date|null|undefined} visitDate
 * @param {string|null|undefined} visitTime
 * @returns {Date|null}
 */
export function visitUtcInstantFromFields(visitDate, visitTime) {
  if (visitDate == null || visitDate === "") return null;

  const datePart = String(visitDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return parseInstant(visitDate);
  }

  if (visitTime) {
    const match = String(visitTime).trim().match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      const hh = match[1];
      const mm = match[2];
      const ss = match[3] ?? "00";
      const instant = new Date(`${datePart}T${hh}:${mm}:${ss}Z`);
      return Number.isNaN(instant.getTime()) ? null : instant;
    }
  }

  const midnight = new Date(`${datePart}T00:00:00Z`);
  return Number.isNaN(midnight.getTime()) ? null : midnight;
}

/**
 * Human-readable "visit conducted" label for Visit Detail and lists.
 * @param {{ visit_date?: string, visit_time?: string, created_at?: string }|null|undefined} visit
 * @returns {string}
 */
export function formatVisitConductedAt(visit) {
  if (!visit || typeof visit !== "object") return "—";

  let instant = null;
  if (visit.visit_date) {
    instant = visitUtcInstantFromFields(visit.visit_date, visit.visit_time);
  } else if (visit.created_at) {
    instant = parseInstant(visit.created_at);
  }

  if (!instant) return "—";
  return formatIndiaDateTime(instant);
}

/**
 * YYYY-MM-DD from an ISO/datetime string in Asia/Kolkata.
 * @param {string|number|Date|null|undefined} value
 * @returns {string|null}
 */
export function toBusinessIsoDate(value) {
  if (value == null || value === "") return null;
  const d = parseInstant(value);
  if (!d) {
    const raw = String(value);
    return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
  }
  return todayIsoDate(d);
}
