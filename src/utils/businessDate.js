/**
 * Asia/Kolkata business-date helpers — matches mobile/backend duty day boundaries.
 */

export const BUSINESS_TIME_ZONE = "Asia/Kolkata";

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

/**
 * Format an instant for admin UI in Asia/Kolkata.
 * @param {string|number|Date|null|undefined} value
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatBusinessDateTime(value, options = {}) {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
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

/**
 * YYYY-MM-DD from an ISO/datetime string in Asia/Kolkata.
 * @param {string|number|Date|null|undefined} value
 * @returns {string|null}
 */
export function toBusinessIsoDate(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    const raw = String(value);
    return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
  }
  return todayIsoDate(d);
}
