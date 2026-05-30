import { unwrapSuccessEnvelope, resolveList, getResponseBody } from "./apiUnwrap";

/**
 * Extract object payload from dashboard stat endpoints.
 * Supports axios response.data, { success, data }, nested data.data, and plain objects.
 */
export function extractDashboardObject(payload) {
  const body = unwrapSuccessEnvelope(payload) ?? getResponseBody(payload) ?? payload;
  if (body == null) return {};
  if (typeof body !== "object" || Array.isArray(body)) return {};

  if (
    body.data != null &&
    typeof body.data === "object" &&
    !Array.isArray(body.data) &&
    body.success !== true
  ) {
    return body.data;
  }

  return body;
}

/**
 * Extract list payloads from dashboard endpoints.
 * Supports DRF results, nested data.results, and resolveList fallbacks.
 */
export function extractDashboardList(payload) {
  const fromResolve = resolveList(payload);
  if (fromResolve.length > 0) return fromResolve;

  const body = getResponseBody(payload) ?? payload;
  if (body == null) return [];

  if (Array.isArray(body.results)) return body.results;
  if (Array.isArray(body?.data?.results)) return body.data.results;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body)) return body;

  return [];
}
