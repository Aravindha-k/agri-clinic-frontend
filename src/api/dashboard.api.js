import api from "./axios";
import { getFarmers } from "./farmer.api";

// Dashboard summary (totals: visits, today_visits, active_employees) — GET /dashboard/summary/
export const getDashboardStats = () => api.get("dashboard/summary/");

// Dashboard stats (KPI counts + chart data) — GET /dashboard/stats/
export const getDashboardChartStats = () => api.get("dashboard/stats/");

// Visit trends (monthly counts) — GET /dashboard/visit-trends/
export const getVisitTrends = () => api.get("dashboard/visit-trends/");

// Map farmers - GET /map/farmers/
export const getMapFarmers = async () => {
    try {
        return await api.get("map/farmers/");
    } catch (err) {
        if (err?.response?.status === 500) {
            const farmers = await getFarmers({ page_size: 500 });
            const raw = farmers?.results ?? [];
            return {
                data: {
                    data: raw
                        .map((f) => {
                            const gps = f.gps_location || f.location || "";
                            const [lat, lng] = String(gps).split(",").map((x) => Number(x.trim()));
                            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                            return {
                                id: f.id,
                                name: f.name || f.farmer_name,
                                latitude: lat,
                                longitude: lng,
                                crop: f.crop_name || f.crop,
                            };
                        })
                        .filter(Boolean),
                },
            };
        }
        throw err;
    }
};
