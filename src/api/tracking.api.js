import api from "./axios";
import { unwrapSuccessEnvelope, getResponseBody } from "../utils/apiUnwrap";
import { resolveGeoFeatures, normalizeTrackingStats } from "../utils/trackingNormalize";
import { isUnreachableError } from "../utils/apiBackoff";

const TAG = "[tracking.api]";

function logTrackingError(fn, err) {
    if (isUnreachableError(err)) {
        console.warn(TAG, `${fn}: backend unreachable`);
        return;
    }
    console.error(TAG, `${fn} failed:`, err.response?.status, err.message);
}

// Dashboard stats — GET /tracking/admin/dashboard-stats/
export const getDashboardStats = async () => {
    try {
        const response = await api.get("tracking/admin/dashboard-stats/");
        return normalizeTrackingStats(getResponseBody(response));
    } catch (err) {
        logTrackingError("getDashboardStats", err);
        throw err;
    }
};

// Live employee status — GET /tracking/admin/status/
export const getAdminStatus = async () => {
    try {
        const response = await api.get("tracking/admin/status/");
        return response.data;
    } catch (err) {
        logTrackingError("getAdminStatus", err);
        throw err;
    }
};

// Employee route — GET /tracking/admin/employee/<user_id>/route/
export const getEmployeeRoute = async (userId) => {
    try {
        const url = `tracking/admin/employee/${userId}/route/`;
        console.debug(TAG, "getEmployeeRoute →", url);
        const response = await api.get(url);
        return response.data;
    } catch (err) {
        console.error(TAG, `getEmployeeRoute(${userId}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

// Employee stats (KPI) — GET /tracking/employee-stats/
export const getEmployeeStats = async () => {
    try {
        const response = await api.get("tracking/employee-stats/");
        return response.data;
    } catch (err) {
        console.error(TAG, "getEmployeeStats failed:", err.response?.status, err.message);
        throw err;
    }
};

// Single employee summary — GET /tracking/admin/employee/<user_id>/summary/
export const getEmployeeSummary = async (userId) => {
    try {
        const url = `tracking/admin/employee/${userId}/summary/`;
        console.debug(TAG, "getEmployeeSummary →", url);
        const response = await api.get(url);
        return response.data;
    } catch (err) {
        console.error(TAG, `getEmployeeSummary(${userId}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

// Single employee activity timeline — GET /tracking/admin/employee/<user_id>/activity/
export const getEmployeeActivity = async (userId) => {
    try {
        const url = `tracking/admin/employee/${userId}/activity/`;
        console.debug(TAG, "getEmployeeActivity →", url);
        const response = await api.get(url);
        return response.data;
    } catch (err) {
        console.error(TAG, `getEmployeeActivity(${userId}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

// Employee geo data — GET /tracking/admin/geo/employees/
export const getEmployeeGeo = async () => {
    try {
        const response = await api.get("tracking/admin/geo/employees/");
        const inner = unwrapSuccessEnvelope(response) ?? getResponseBody(response);
        const features = resolveGeoFeatures(inner);
        return {
            type: "FeatureCollection",
            features,
            ...(typeof inner === "object" && inner !== null ? inner : {}),
        };
    } catch (err) {
        console.error(TAG, "getEmployeeGeo failed:", err.response?.status, err.message);
        throw err;
    }
};

// Workday history — GET /tracking/workdays/history/
export const getWorkdayHistory = async () => {
    try {
        const response = await api.get("tracking/workdays/history/");
        return response.data;
    } catch (err) {
        console.error(TAG, "getWorkdayHistory failed:", err.response?.status, err.message);
        throw err;
    }
};

// Last known location — GET /tracking/admin/geo/last_location/<user_id>/
export const getLastLocation = async (userId) => {
    try {
        const response = await api.get(`tracking/admin/geo/last_location/${userId}/`);
        return response.data;
    } catch (err) {
        console.error(TAG, `getLastLocation(${userId}) failed:`, err.response?.status, err.message);
        throw err;
    }
};