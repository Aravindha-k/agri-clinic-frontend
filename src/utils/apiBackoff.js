/**
 * Shared backoff when the API / Vite proxy is unreachable (ECONNREFUSED, network error).
 * Stops hammering the dev proxy when Django is not running.
 */

import { getApiHostLabel } from "../config/api";

let failureCount = 0;
let lastFailureAt = 0;

const BASE_MS = 30_000;
const MAX_BACKOFF_MS = 5 * 60_000;

export function isUnreachableError(err) {
  if (!err) return false;
  if (!err.response) return true;
  const status = err.response?.status;
  return status === 502 || status === 503 || status === 504;
}

export function recordApiSuccess() {
  failureCount = 0;
  lastFailureAt = 0;
}

export function recordApiFailure(err) {
  if (!isUnreachableError(err)) return;
  failureCount += 1;
  lastFailureAt = Date.now();
}

export function getBackoffMs() {
  if (failureCount === 0) return 0;
  return Math.min(BASE_MS * 2 ** (failureCount - 1), MAX_BACKOFF_MS);
}

export function shouldPausePolling() {
  if (failureCount === 0) return false;
  return Date.now() - lastFailureAt < getBackoffMs();
}

export function backendUnavailableMessage() {
  const host =
    import.meta.env.VITE_API_BASE_URL?.trim() || getApiHostLabel();
  if (import.meta.env.PROD) {
    return `Backend unavailable (${host}). Check the API is running and refresh.`;
  }
  return `Backend unavailable. Start Django (${host}) and refresh.`;
}
