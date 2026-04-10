import api from "./axios";

const TAG = "[employee.api]";
const BASE = "employees";

// List all employees — GET /employees/
export const getEmployees = async () => {
    const response = await api.get("employees/");
    return response.data;
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
    try {
        const response = await api.post(`${BASE}/admin/employees/${id}/toggle-status/`);
        return response.data;
    } catch (err) {
        console.error(TAG, `toggleEmployeeStatus(${id}) failed:`, err.response?.status, err.message);
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