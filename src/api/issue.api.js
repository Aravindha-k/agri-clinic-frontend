import api from "./axios";

const TAG = "[issue.api]";
const BASE = "issues";

export const getIssues = async (params = {}) => {
    try {
        const clean = {};
        Object.entries(params).forEach(([k, v]) => {
            if (v !== "" && v !== null && v !== undefined) clean[k] = v;
        });
        const response = await api.get(`${BASE}/`, { params: clean });
        return response.data;
    } catch (err) {
        console.error(TAG, "getIssues failed:", err.response?.status, err.message);
        throw err;
    }
};

export const getIssueDetail = async (id) => {
    try {
        const response = await api.get(`${BASE}/${id}/`);
        return response.data;
    } catch (err) {
        console.error(TAG, `getIssueDetail(${id}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

export const updateIssue = async (id, data) => {
    try {
        const response = await api.put(`${BASE}/${id}/`, data);
        return response.data;
    } catch (err) {
        console.error(TAG, `updateIssue(${id}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

export const addRecommendation = async (issueId, data) => {
    try {
        const response = await api.post(`${BASE}/${issueId}/recommend/`, data);
        return response.data;
    } catch (err) {
        console.error(TAG, `addRecommendation(${issueId}) failed:`, err.response?.status, err.message);
        throw err;
    }
};

export const getRecommendations = async (params = {}) => {
    try {
        const clean = {};
        Object.entries(params).forEach(([k, v]) => {
            if (v !== "" && v !== null && v !== undefined) clean[k] = v;
        });
        const response = await api.get("recommendations/", { params: clean });
        return response.data;
    } catch (err) {
        console.error(TAG, "getRecommendations failed:", err.response?.status, err.message);
        throw err;
    }
};
