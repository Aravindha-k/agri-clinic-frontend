/**
 * Shared admin API error normalizer — never surface raw JSON / stack traces.
 */

import { extractAuthError, isAdminSessionExpiredError } from "./authErrors";
import { backendUnavailableMessage, isUnreachableError } from "./apiBackoff";

const DUPLICATE_PHONE_MESSAGE = "A farmer with this phone number already exists.";
const FORCE_END_FAILURE_MESSAGE =
  "Could not end this employee’s workday. Please refresh and try again.";

function firstFieldMessage(data, field) {
  if (!data || typeof data !== "object") return null;
  const raw = data[field] ?? data?.errors?.[field];
  if (Array.isArray(raw) && raw.length) {
    const first = raw[0];
    if (typeof first === "string") return first;
    if (first?.message) return String(first.message);
  }
  if (typeof raw === "string") return raw;
  return null;
}

function collectFieldErrors(data) {
  if (!data || typeof data !== "object") return {};
  const source = data.errors && typeof data.errors === "object" ? data.errors : data;
  const out = {};
  for (const [key, val] of Object.entries(source)) {
    if (key === "detail" || key === "message" || key === "code" || key === "error_code") continue;
    if (typeof val === "string") out[key] = val;
    else if (Array.isArray(val) && val.length) {
      const first = val[0];
      out[key] = typeof first === "string" ? first : String(first?.message ?? first);
    }
  }
  return out;
}

function looksLikeDuplicatePhone(text) {
  return /phone.*(exist|unique|already|duplicate)|already.*phone|unique.*phone/i.test(text);
}

/**
 * Map farmer create/update validation errors to form fields.
 * @returns {{ formError: string, fieldErrors: Record<string, string> }}
 */
export function normalizeFarmerFormError(err, fallback = "Failed to save farmer.") {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const fields = collectFieldErrors(data);
  const phoneMsg = firstFieldMessage(data, "phone") || firstFieldMessage(data, "mobile");
  const { code, message, detail } = extractAuthError(err);
  const blob = `${code ?? ""} ${message} ${detail} ${phoneMsg ?? ""} ${JSON.stringify(fields)}`;

  if (status === 400 || status === 409) {
    if (phoneMsg || looksLikeDuplicatePhone(blob)) {
      return {
        formError: DUPLICATE_PHONE_MESSAGE,
        fieldErrors: { ...fields, phone: DUPLICATE_PHONE_MESSAGE },
      };
    }
    if (Object.keys(fields).length) {
      const first = Object.values(fields)[0];
      return { formError: first || fallback, fieldErrors: fields };
    }
  }

  if (isUnreachableError(err) || !err?.response) {
    return { formError: backendUnavailableMessage(), fieldErrors: {} };
  }

  if (status === 401 || isAdminSessionExpiredError(err)) {
    return { formError: "Your session expired. Please sign in again.", fieldErrors: {} };
  }

  if (status === 403) {
    return { formError: "You do not have permission to save this farmer.", fieldErrors: {} };
  }

  if (status === 404) {
    return { formError: "This farmer record was not found. It may have been deleted.", fieldErrors: {} };
  }

  if (status >= 500) {
    return { formError: "Server error while saving farmer. Please try again.", fieldErrors: {} };
  }

  const readable = detail || message;
  if (readable && readable.length <= 160 && readable !== "[object Object]") {
    return { formError: readable, fieldErrors: fields };
  }

  return { formError: fallback, fieldErrors: fields };
}

/**
 * Normalize force-end duty failures.
 */
export function normalizeForceEndError(err) {
  const status = err?.response?.status;
  const { code, message, detail } = extractAuthError(err);
  const text = `${code ?? ""} ${message} ${detail}`.toUpperCase();

  if (isUnreachableError(err) || !err?.response) {
    return backendUnavailableMessage();
  }
  if (status === 401 || isAdminSessionExpiredError(err)) {
    return "Your session expired. Please sign in again.";
  }
  if (code === "EMPLOYEE_END_FORBIDDEN" || (status === 403 && text.includes("EMPLOYEE_END"))) {
    return "Only an admin can force-end an employee workday.";
  }
  if (status === 403) {
    return "You do not have permission to end this workday.";
  }
  if (code === "OUTSIDE_DUTY_WINDOW" || text.includes("OUTSIDE_DUTY_WINDOW")) {
    return "This location update is outside the active duty window.";
  }
  if (code === "SESSION_REPLACED" || status === 409 || text.includes("SESSION_REPLACED")) {
    return "This duty session was replaced. Refresh and try again.";
  }
  if (status === 404) {
    return "No active workday found for this employee.";
  }
  return FORCE_END_FAILURE_MESSAGE;
}

export function normalizeAdminApiError(
  err,
  fallback = "Something went wrong. Please try again."
) {
  if (!err) return fallback;

  if (typeof err === "string") {
    if (err.length > 160 || err.trim().startsWith("{") || err.includes("<html")) return fallback;
    return err;
  }

  if (isUnreachableError(err) || !err?.response) {
    return backendUnavailableMessage();
  }

  const status = err.response.status;
  const { code, message, detail } = extractAuthError(err);

  if (status === 401 || isAdminSessionExpiredError(err)) {
    return "Your session expired. Please sign in again.";
  }
  if (code === "SESSION_REPLACED") {
    return "Your session was replaced by another login. Please sign in again.";
  }
  if (status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (status === 404) {
    return "The requested record was not found.";
  }
  if (status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (status >= 500) {
    return "Our servers had a hiccup. Please try again in a moment.";
  }

  const readable = detail || message;
  if (readable && readable.length <= 160 && readable !== "[object Object]" && !readable.startsWith("{")) {
    return readable;
  }
  return fallback;
}

export { DUPLICATE_PHONE_MESSAGE, FORCE_END_FAILURE_MESSAGE };
