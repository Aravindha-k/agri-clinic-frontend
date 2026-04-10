import api from "./axios";

const TAG = "[farmer.api]";
const BASE = "farmers";

export const getFarmers = async (params = {}) => {
    try {
        const clean = {};
        Object.entries(params).forEach(([k, v]) => {
            if (v !== "" && v !== null && v !== undefined) clean[k] = v;
        });
        const response = await api.get(`${BASE}/`, { params: clean });
        return response.data;
    } catch (err) {
        console.error(TAG, "getFarmers failed:", err.response?.status, err.message);
        throw err;
    }
};

export const getFarmerDetail = async (phone) => {
    try {
        const response = await api.get(`${BASE}/${phone}/`);
        return response.data;
    } catch (err) {
        console.error(TAG, `getFarmerDetail(${phone}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

export const createFarmer = async (data) => {
    try {
        const response = await api.post(`${BASE}/`, data);
        return response.data;
    } catch (err) {
        console.error(TAG, "createFarmer failed:", err.response?.status, err.message);
        throw err;
    }
};

export const updateFarmer = async (id, data) => {
    try {
        const response = await api.put(`${BASE}/${id}/`, data);
        return response.data;
    } catch (err) {
        console.error(TAG, `updateFarmer(${id}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

export const deleteFarmer = async (id) => {
    try {
        const response = await api.delete(`${BASE}/${id}/`);
        return response.data;
    } catch (err) {
        console.error(TAG, `deleteFarmer(${id}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

export const getFarmerFields = async (phone) => {
    try {
        const response = await api.get(`${BASE}/${phone}/fields/`);
        return response.data;
    } catch (err) {
        console.error(TAG, `getFarmerFields(${phone}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

export const getFarmerVisits = async (phone) => {
    try {
        const response = await api.get(`${BASE}/${phone}/visits/`);
        return response.data;
    } catch (err) {
        console.error(TAG, `getFarmerVisits(${phone}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

export const getFarmerStats = async () => {
    try {
        const response = await api.get(`${BASE}/stats/`);
        return response.data;
    } catch (err) {
        console.error(TAG, "getFarmerStats failed:", err.response?.status, err.message);
        throw err;
    }
};

export const getFarmerActivity = async (id, params = {}) => {
    try {
        const clean = {};
        Object.entries(params).forEach(([k, v]) => {
            if (v !== "" && v !== null && v !== undefined) clean[k] = v;
        });
        const response = await api.get(`${BASE}/${id}/activity/`, { params: clean });
        return response.data;
    } catch (err) {
        console.error(TAG, `getFarmerActivity(${id}) failed:`, err.response?.status, err.message);
        throw err;
    }
};
