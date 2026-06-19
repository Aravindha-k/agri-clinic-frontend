import api from "./axios";
import { unwrapSuccessEnvelope, getResponseBody, resolvePaginated } from "../utils/apiUnwrap";
import { normalizeEmployeeSummaryResponse } from "../utils/deviceStatus";
import { resolveGeoFeatures, normalizeTrackingStats } from "../utils/trackingNormalize";
import {
  normalizeEmployeeRoute,
  normalizeRoutePointList,
} from "../utils/employeeRoute";
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
/** @deprecated Use getTrackingLive from adminTracking.api.js for duty tracking */
export const getAdminStatus = async () => {
    try {
        const response = await api.get("tracking/admin/status/");
        return response.data;
    } catch (err) {
        logTrackingError("getAdminStatus", err);
        throw err;
    }
};

// Employee route — GET /tracking/admin/employee/<user_id>/route/?date=YYYY-MM-DD
/** @deprecated Use getEmployeeDutyRoute from adminTracking.api.js */
export const getEmployeeRoute = async (userId, { date } = {}) => {
    try {
        const url = `tracking/admin/employee/${userId}/route/`;
        const params = date ? { date } : undefined;
        if (import.meta.env.DEV) {
          console.debug(TAG, "getEmployeeRoute →", url, params ?? "");
        }
        const response = await api.get(url, { params });
        return normalizeEmployeeRoute(response);
    } catch (err) {
        console.error(TAG, `getEmployeeRoute(${userId}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

// Workday GPS trail — GET /tracking/workday/<workday_id>/locations/
export const getWorkdayLocations = async (workdayId, params = {}) => {
    try {
        const response = await api.get(`tracking/workday/${workdayId}/locations/`, {
            params: { page_size: 500, ...params },
        });
        const page = resolvePaginated(response);
        const points = normalizeRoutePointList(page.results ?? []);
        return { ...page, points };
    } catch (err) {
        console.error(TAG, `getWorkdayLocations(${workdayId}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

/** Paginated fetch of all workday location points (admin fallback for today). */
/** @deprecated Duty routes use /api/admin/tracking/ — do not use LocationLog workday APIs */
export async function fetchAllWorkdayLocations(workdayId) {
    const combined = [];
    for (let page = 1; page <= 25; page += 1) {
        const batch = await getWorkdayLocations(workdayId, { page });
        combined.push(...(batch.points ?? []));
        if (!batch.next || !(batch.points?.length)) break;
    }
    return combined;
}

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
        if (import.meta.env.DEV) {
          console.debug(TAG, "getEmployeeSummary →", url);
        }
        const response = await api.get(url);
        return normalizeEmployeeSummaryResponse(response);
    } catch (err) {
        console.error(TAG, `getEmployeeSummary(${userId}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

// Tracking diagnostics — GET /tracking/admin/employee/<user_id>/diagnostics/
export const getEmployeeTrackingDiagnostics = async (userId) => {
    try {
        const url = `tracking/admin/employee/${userId}/diagnostics/`;
        if (import.meta.env.DEV) {
          console.debug(TAG, "getEmployeeTrackingDiagnostics →", url);
        }
        const response = await api.get(url);
        return unwrapSuccessEnvelope(response) ?? response.data;
    } catch (err) {
        console.error(TAG, `getEmployeeTrackingDiagnostics(${userId}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

// Single employee activity timeline — GET /tracking/admin/employee/<user_id>/activity/
export const getEmployeeActivity = async (userId) => {
    try {
        const url = `tracking/admin/employee/${userId}/activity/`;
        if (import.meta.env.DEV) {
          console.debug(TAG, "getEmployeeActivity →", url);
        }
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
