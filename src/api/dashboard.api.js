import api from "./axios";

// Dashboard summary (totals: visits, today_visits, active_employees) — GET /dashboard/summary/
export const getDashboardStats = () => api.get("dashboard/summary/");

// Dashboard stats (KPI counts + chart data) — GET /dashboard/stats/
export const getDashboardChartStats = () => api.get("dashboard/stats/");

// Visit trends (monthly counts) — GET /dashboard/visit-trends/
export const getVisitTrends = () => api.get("dashboard/visit-trends/");

// Map farmers — GET /map/farmers/
export const getMapFarmers = () => api.get("map/farmers/");
