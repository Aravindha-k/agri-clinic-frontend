/**
 * Admin duty tracking APIs — source of truth for live map + routes.
 * Base: /api/admin/tracking/  (NOT /api/v1/tracking/)
 *
 * Paths must use a per-request baseURL — axios treats leading-slash paths as
 * relative to VITE_API_BASE_URL (/api/v1/), which would produce broken URLs like
 * /api/v1/api/admin/tracking/...
 */
import api from "./axios";
import { unwrapSuccessEnvelope, getResponseBody } from "../utils/apiUnwrap";
import { normalizeEmployeeRoute } from "../utils/employeeRoute";
import { normalizeLiveEmployee, resolveLiveEmployeeList } from "../utils/dutyTracking";
import { getAdminTrackingBaseURL } from "../config/api";

export { getAdminTrackingBaseURL };

const trackingRequest = {
  baseURL: getAdminTrackingBaseURL(),
};

function logError(fn, err) {
  if (import.meta.env.DEV) {
    console.error("[adminTracking.api]", fn, err?.response?.status ?? err?.message);
  }
}

/** GET /api/admin/tracking/live/ — employees on duty + last known positions */
export async function getTrackingLive() {
  const response = await api.get("live/", trackingRequest);
  const body = unwrapSuccessEnvelope(response) ?? getResponseBody(response) ?? {};
  const employees = resolveLiveEmployeeList(body).map(normalizeLiveEmployee);
  return {
    updatedAt: body.updated_at ?? null,
    count: body.count ?? employees.length,
    employees,
  };
}

/** GET /api/admin/tracking/employee/{id}/today-route/ */
export async function getEmployeeTodayRoute(userId) {
  const response = await api.get(`employee/${userId}/today-route/`, trackingRequest);
  return normalizeEmployeeRoute(response);
}

/** GET /api/admin/tracking/employee/{id}/route/?date=YYYY-MM-DD */
export async function getEmployeeRouteByDate(userId, date) {
  const response = await api.get(`employee/${userId}/route/`, {
    ...trackingRequest,
    params: { date },
  });
  return normalizeEmployeeRoute(response);
}

/** Today vs historical — picks the correct duty route endpoint */
export async function getEmployeeDutyRoute(userId, { date, isToday = false } = {}) {
  try {
    if (isToday || !date) {
      return await getEmployeeTodayRoute(userId);
    }
    return await getEmployeeRouteByDate(userId, date);
  } catch (err) {
    logError("getEmployeeDutyRoute", err);
    throw err;
  }
}
