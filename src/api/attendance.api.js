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
export const deleteShop = (id) => api.delete(`${BASE}/shops/${id}/`);

/* ── Employees (attendance-only identities) ────────────────────────────── */
export const getAttendanceEmployees = async (params = {}) => {
    const res = await api.get(`${BASE}/employees/`, { params: { page_size: 500, ...params } });
    return resolvePaginated(res);
};
export const createAttendanceEmployee = (data) => api.post(`${BASE}/employees/`, data);
export const updateAttendanceEmployee = (id, data) => api.patch(`${BASE}/employees/${id}/`, data);
export const activateAttendanceEmployee = (id) => api.post(`${BASE}/employees/${id}/activate/`);
export const deactivateAttendanceEmployee = (id) => api.post(`${BASE}/employees/${id}/deactivate/`);

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
export const revokeDevice = async (id) => {
    const res = await api.post(`${BASE}/devices/${id}/revoke/`);
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
