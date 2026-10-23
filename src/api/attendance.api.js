/**
 * Attendance admin API client — Phase 2B contracts.
 *
 * Backend base: /api/v1/admin/attendance/  (axios baseURL already ends in /api/v1)
 * ViewSet list endpoints return DRF pagination ({count, results}).
 * Custom actions and report endpoints return the envelope {success, data}.
 */
import api from "./axios";
import { resolvePaginated, resolveList, unwrapSuccessEnvelope } from "../utils/apiUnwrap";

const BASE = "admin/attendance";

/* ── Shops ─────────────────────────────────────────────────────────────── */
export const getAttendanceShops = async (params = {}) => {
    const res = await api.get(`${BASE}/shops/`, { params: { page_size: 200, ...params } });
    return resolvePaginated(res);
};
export const createShop = (data) => api.post(`${BASE}/shops/`, data);
export const updateShop = (id, data) => api.patch(`${BASE}/shops/${id}/`, data);
/** GET shops/{id}/dependency-summary/ → { shop, dependencies, archived, can_archive, can_permanently_delete } */
export const getShopDependencySummary = async (id) => {
    const res = await api.get(`${BASE}/shops/${id}/dependency-summary/`);
    return unwrapSuccessEnvelope(res);
};
/** Archive a shop (DELETE without permanent flag). Attendance history is preserved. */
export const archiveShop = async (id, reason = "") => {
    const res = await api.delete(`${BASE}/shops/${id}/`, { data: { reason } });
    return unwrapSuccessEnvelope(res);
};
/** Permanently delete a shop — only succeeds when it has zero protected history (409 otherwise). */
export const deleteShopPermanently = async (id, reason = "") => {
    const res = await api.delete(`${BASE}/shops/${id}/`, {
        params: { permanent: true },
        data: { reason },
    });
    return unwrapSuccessEnvelope(res);
};

/* ── Employees (attendance-only identities) ────────────────────────────── */
export const getAttendanceEmployees = async (params = {}) => {
    const res = await api.get(`${BASE}/employees/`, { params: { page_size: 500, ...params } });
    return resolvePaginated(res);
};
export const createAttendanceEmployee = (data) => api.post(`${BASE}/employees/`, data);
export const updateAttendanceEmployee = (id, data) => api.patch(`${BASE}/employees/${id}/`, data);
export const activateAttendanceEmployee = (id) => api.post(`${BASE}/employees/${id}/activate/`);
export const deactivateAttendanceEmployee = (id) => api.post(`${BASE}/employees/${id}/deactivate/`);
/** Transfer employee to another shop — POST /employees/{id}/transfer/ */
export const transferAttendanceEmployee = async (id, shopId) => {
    const res = await api.post(`${BASE}/employees/${id}/transfer/`, { shop_id: shopId });
    return unwrapSuccessEnvelope(res);
};

/* ── Shifts ────────────────────────────────────────────────────────────── */
export const getShifts = async (params = {}) => {
    const res = await api.get(`${BASE}/shifts/`, { params: { page_size: 200, ...params } });
    return resolvePaginated(res);
};
export const createShift = (data) => api.post(`${BASE}/shifts/`, data);
export const updateShift = (id, data) => api.patch(`${BASE}/shifts/${id}/`, data);
export const deleteShift = (id) => api.delete(`${BASE}/shifts/${id}/`);

/* ── Employee ↔ shop assignments ───────────────────────────────────────── */
export const getAssignments = async (params = {}) => {
    const res = await api.get(`${BASE}/assignments/`, { params: { page_size: 500, ...params } });
    return resolvePaginated(res);
};
export const createAssignment = (data) => api.post(`${BASE}/assignments/`, data);
export const updateAssignment = (id, data) => api.patch(`${BASE}/assignments/${id}/`, data);
export const deleteAssignment = (id) => api.delete(`${BASE}/assignments/${id}/`);

/* ── Devices ───────────────────────────────────────────────────────────── */
export const getDevices = async (params = {}) => {
    const res = await api.get(`${BASE}/devices/`, { params: { page_size: 200, ...params } });
    return resolvePaginated(res);
};
/** Returns { device, token } — plaintext token is shown ONCE. */
export const registerDevice = async (data) => {
    const res = await api.post(`${BASE}/devices/`, data);
    return unwrapSuccessEnvelope(res);
};
/**
 * Generate a one-time 6-digit pairing code for a new device.
 * POST devices/pairing-codes/ {"shop_id": N} →
 * { pairing_code, expires_in_seconds, expires_at, device_uid, shop_id, shop_code }
 * The device token is issued later, directly to the kiosk — it never
 * passes through the admin panel.
 */
export const createPairingCode = async (payload) => {
    const body = typeof payload === "object" ? payload : { shop_id: payload };
    const res = await api.post(`${BASE}/devices/pairing-codes/`, body);
    return unwrapSuccessEnvelope(res);
};
/** Issue a NEW setup code for an EXISTING device — never creates a duplicate. */
export const reissueDevicePairingCode = async (deviceId) => {
    const res = await api.post(`${BASE}/devices/pairing-codes/`, { device_id: deviceId });
    return unwrapSuccessEnvelope(res);
};
export const revokeDevice = async (id) => {
    const res = await api.post(`${BASE}/devices/${id}/revoke/`);
    return unwrapSuccessEnvelope(res);
};
/** Restore a revoked device — POST devices/{id}/restore/ (409 if not revoked). */
export const restoreDevice = async (id) => {
    const res = await api.post(`${BASE}/devices/${id}/restore/`);
    return unwrapSuccessEnvelope(res);
};
/** Rename / update a device (PATCH devices/{id}/). device_uid is read-only. */
export const updateDevice = async (id, data) => {
    const res = await api.patch(`${BASE}/devices/${id}/`, data);
    return res?.data?.data ?? res?.data ?? res;
};
/** Delete a device — backend revokes it if it has history, hard-deletes if disposable. */
export const deleteDevice = async (id, reason = "") => {
    const res = await api.delete(`${BASE}/devices/${id}/`, { data: { reason } });
    return unwrapSuccessEnvelope(res);
};
/** Returns { device, token } — plaintext token is shown ONCE. */
export const rotateDeviceToken = async (id) => {
    const res = await api.post(`${BASE}/devices/${id}/rotate/`);
    return unwrapSuccessEnvelope(res);
};

/* ── Reports ───────────────────────────────────────────────────────────── */
/**
 * Daily summaries. Params: date_from, date_to, shop_id, employee_id,
 * include_test (bool), verified_only (bool).
 * TEST_MANUAL rows are excluded by default on the backend.
 */
export const getDailyReport = async (params = {}) => {
    const res = await api.get(`${BASE}/reports/daily/`, { params });
    return resolveList(res.data);
};
/**
 * Raw attendance events (check-in / check-out).
 * Params: date_from, date_to, shop_id, employee_id, include_test.
 */
export const getEventReport = async (params = {}) => {
    const res = await api.get(`${BASE}/reports/events/`, { params });
    return resolveList(res.data);
};
/** Attendance audit log. Optional param: action. */
export const getAttendanceAuditLogs = async (params = {}) => {
    const res = await api.get(`${BASE}/audit-logs/`, { params });
    return resolveList(res.data);
};

/* ── Face enrollments (metadata only — no images/embeddings) ───────────── */
export const getFaceEnrollments = async (params = {}) => {
    const res = await api.get(`${BASE}/face-enrollments/`, { params: { page_size: 200, ...params } });
    return resolvePaginated(res);
};
/** Authorize enrollment: { employee, shop, device, consent_recorded: true } → PENDING enrollment. */
export const authorizeFaceEnrollment = async (data) => {
    const res = await api.post(`${BASE}/face-enrollments/`, data);
    return unwrapSuccessEnvelope(res);
};
/** Revoke a PENDING/ACTIVE enrollment. Optional { reason }. */
export const revokeFaceEnrollment = async (id, reason = "") => {
    const res = await api.post(`${BASE}/face-enrollments/${id}/revoke/`, { reason });
    return unwrapSuccessEnvelope(res);
};
