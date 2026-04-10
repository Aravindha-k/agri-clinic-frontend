import api from "./axios";

const TAG = "[visit.api]";

// List visits — GET /visits/
export const getVisits = async (params) => {
    try {
        const response = await api.get("visits/", { params });
        // Prefer .results, fallback to .data, fallback to array, fallback to []
        if (Array.isArray(response.data?.results)) return response.data.results;
        if (Array.isArray(response.data)) return response.data;
        return [];
    } catch (err) {
        console.error(TAG, "getVisits failed:", err.response?.status, err.message);
        return [];
    }
};

// (Optional: If stats endpoint is not in requirements, you may remove this)

// Get visit detail — GET /visits/{id}/
export const getVisitDetail = async (id) => {
    try {
        const response = await api.get(`visits/${id}/`);
        return response.data || {};
    } catch (err) {
        console.error(TAG, "getVisitDetail failed:", err.response?.status, err.message);
        return {};
    }
};

// Create visit — POST /visits/
export const createVisit = async (data) => {
    try {
        const response = await api.post("visits/", data);
        return response.data;
    } catch (err) {
        console.error(TAG, "createVisit failed:", err.response?.status, err.message);
        throw err;
    }
};

// Upload photo — POST /visits/upload-photo/
export const uploadVisitPhoto = async (data) => {
    try {
        const response = await api.post("visits/upload-photo/", data);
        return response.data;
    } catch (err) {
        console.error(TAG, "uploadVisitPhoto failed:", err.response?.status, err.message);
        throw err;
    }
};
// Start visit — POST /visits/start/
export const startVisit = async (data) => {
    try {
        const response = await api.post("visits/start/", data);
        return response.data;
    } catch (err) {
        console.error(TAG, "startVisit failed:", err.response?.status, err.message);
        throw err;
    }
};

// Complete visit — POST /visits/{id}/complete/
export const completeVisit = async (id) => {
    try {
        const response = await api.post(`visits/${id}/complete/`);
        return response.data;
    } catch (err) {
        console.error(TAG, "completeVisit failed:", err.response?.status, err.message);
        throw err;
    }
};
