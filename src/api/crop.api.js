import api from "./axios";

const TAG = "[crop.api]";

export const getCrops = async (params = {}) => {
    try {
        const clean = {};
        Object.entries(params).forEach(([k, v]) => {
            if (v !== "" && v !== null && v !== undefined) clean[k] = v;
        });
        const response = await api.get("masters/crops/", { params: clean });
        if (Array.isArray(response.data?.results)) return response.data.results;
        if (Array.isArray(response.data)) return response.data;
        return [];
    } catch (err) {
        console.error(TAG, "getCrops failed:", err.response?.status, err.message);
        return [];
    }
};

export const createCrop = async (data) => {
    try {
        const response = await api.post("masters/crops/", data);
        return response.data;
    } catch (err) {
        console.error(TAG, "createCrop failed:", err.response?.status, err.message);
        throw err;
    }
};
