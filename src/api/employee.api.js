import api from "./axios";
import { unwrapSuccessEnvelope, resolvePaginated, resolveList } from "../utils/apiUnwrap";
import { photoUrlFromUploadResponse, profilePhotoVersion } from "../utils/profilePhoto";

const TAG = "[employee.api]";
const BASE = "employees";

function normalizeEmployeeRow(row) {
    if (!row || typeof row !== "object") return row;
    return {
        ...row,
        is_active: row.is_active ?? row.is_active_employee,
        district_name: row.district_name ?? (typeof row.district === "string" ? row.district : row.district?.name),
    };
}

// List employees — prefers admin list (includes profile_photo_url), falls back to legacy list
export const getEmployees = async (params = {}) => {
    try {
        const response = await api.get(`${BASE}/admin/employees/`, {
            params: { page_size: 500, ...params },
        });
        const body = unwrapSuccessEnvelope(response) ?? response.data;
        const page = resolvePaginated({ data: body });
        const rows = page.results?.length ? page.results : resolveList(body);
        if (rows.length > 0) {
            return rows.map(normalizeEmployeeRow);
        }
    } catch (err) {
        if (import.meta.env?.DEV) {
            console.warn(TAG, "admin employees list unavailable, using legacy list", err?.message);
        }
    }

    const response = await api.get(`${BASE}/`);
    const rows = resolveList(response.data);
    return rows.map(normalizeEmployeeRow);
};

// Create employee — POST /employees/create/
export const createEmployee = (data) => api.post("employees/create/", data);

// Get employee — GET /employees/{id}/
export const getEmployee = (id) => api.get(`employees/${id}/`);

// Update employee — PUT /employees/{id}/
export const updateEmployee = (id, data) => api.put(`employees/${id}/`, data);

// Delete employee — DELETE /employees/{id}/
export const deleteEmployee = (id) => api.delete(`employees/${id}/`);

// Toggle active/inactive — POST /employees/{employee_id}/toggle/
export const toggleEmployee = (id) => api.post(`employees/${id}/toggle/`);

// Toggle employee status — POST /employees/:id/toggle-status/
export const toggleEmployeeStatus = async (id) => {
    const urls = [
        `${BASE}/admin/employees/${id}/toggle-status/`,
        `${BASE}/${id}/toggle-status/`,
        `${BASE}/${id}/toggle/`,
    ];

    let lastErr;
    for (const url of urls) {
        try {
            const response = await api.post(url);
            return response.data;
        } catch (err) {
            lastErr = err;
            const status = err?.response?.status;
            if (status !== 404 && status !== 405) break;
        }
    }

    console.error(TAG, `toggleEmployeeStatus(${id}) failed:`, lastErr?.response?.status, lastErr?.message);
    throw lastErr;
};

export const toggleEmployeeStatusByEmployeeId = async (employeeId) => {
    try {
        const response = await api.post(`${BASE}/${employeeId}/toggle/`);
        return response.data;
    } catch (err) {
        console.error(TAG, `toggleEmployeeStatusByEmployeeId(${employeeId}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

// Partial update (active toggle, etc.) — PATCH /employees/{id}/
export const patchEmployee = (id, data) => api.patch(`${BASE}/${id}/`, data);

// Change password (requires current password) — POST /employees/change-password/
export const changePassword = async (data) => {
    try {
        const response = await api.post(`${BASE}/change-password/`, data);
        return response.data;
    } catch (err) {
        console.error(TAG, "changePassword failed:", err.response?.status, err.message);
        throw err;
    }
};

// Admin reset password (no current password required) — POST /employees/admin/reset-password/
export const adminResetPassword = async (data) => {
    try {
        const response = await api.post(`${BASE}/admin/reset-password/`, data);
        return response.data;
    } catch (err) {
        console.error(TAG, "adminResetPassword failed:", err.response?.status, err.message);
        throw err;
    }
};

/** PATCH /admin/employees/{profileId}/photo/ — multipart profile_photo */
export const uploadEmployeePhoto = async (profileId, file) => {
    const form = new FormData();
    form.append("profile_photo", file);
    const response = await api.patch(`admin/employees/${profileId}/photo/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    const data = unwrapSuccessEnvelope(response) ?? response.data;
    const base = unwrapSuccessEnvelope(response) ?? data;
    return {
        ...base,
        profile_photo_url:
            base?.profile_photo_url ?? photoUrlFromUploadResponse(response)?.split("?")[0],
        profile_photo_updated_at:
            base?.profile_photo_updated_at ?? profilePhotoVersion(base),
    };
};
