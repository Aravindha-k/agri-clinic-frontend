import api from "./axios";

function extractAuditRecords(raw) {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.results)) return raw.results;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.items)) return raw.items;
    if (Array.isArray(raw?.data?.results)) return raw.data.results;
    return [];
}

export const getAuditLogs = async () => {
    try {
        const res = await api.get("audit/logs/");
        return extractAuditRecords(res.data);
    } catch (err) {
        const status = err?.response?.status;
        if (status === 404 || status === 405) return [];
        throw err;
    }
};
