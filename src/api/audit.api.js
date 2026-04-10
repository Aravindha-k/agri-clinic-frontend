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
        const records = extractAuditRecords(res.data);
        if (records.length > 0) return records;
    } catch (err) {
        const status = err?.response?.status;
        if (status && status !== 404 && status !== 405) {
            throw err;
        }
    }

    const fallback = await api.get("audit/");
    return extractAuditRecords(fallback.data);
};