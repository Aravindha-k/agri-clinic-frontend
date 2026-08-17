import api from "./axios";
import { unwrapSuccessEnvelope, resolvePaginated } from "../utils/apiUnwrap";

const TAG = "[employeeLocationAssignments.api]";

/**
 * GET /api/v1/admin/employee-location-assignments/
 * Compact employee rows with location_assignment_summary counts and preview names.
 */
export async function fetchEmployeeLocationAssignments(params = {}) {
  const response = await api.get("admin/employee-location-assignments/", { params });
  const body = unwrapSuccessEnvelope(response) ?? response?.data ?? {};
  const page = resolvePaginated({ data: body });
  return {
    results: page.results ?? [],
    count: page.count ?? (page.results?.length ?? 0),
    next: page.next ?? null,
    previous: page.previous ?? null,
  };
}

/**
 * GET /api/v1/admin/employees/{profileId}/location-assignments/
 */
export async function fetchEmployeeLocationAssignmentDetail(profileId) {
  const response = await api.get(`admin/employees/${profileId}/location-assignments/`);
  return unwrapSuccessEnvelope(response) ?? response?.data ?? {};
}

/**
 * PUT /api/v1/admin/employees/{profileId}/location-assignments/
 * Atomic replacement — submitted assignments become the exact final set.
 */
export async function updateEmployeeLocationAssignments(profileId, payload) {
  const response = await api.put(`admin/employees/${profileId}/location-assignments/`, payload);
  const data = unwrapSuccessEnvelope(response) ?? response?.data ?? {};
  return {
    data,
    message: response?.data?.message ?? "Location assignments updated.",
  };
}

export function logAssignmentApiError(label, err) {
  if (import.meta.env?.DEV) {
    console.warn(TAG, label, err?.response?.status, err?.message);
  }
}
