// Robust helper to extract array from any API response
function resolveList(res) {
  const raw = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.features)) return raw.features;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardStats, getDashboardChartStats, getVisitTrends } from "../api/dashboard.api";
import { unwrapResponse } from "../api/axios";
import {
  getEmployeeGeo,
  getWorkdayHistory,
} from "../api/tracking.api";
import { getVisits } from "../api/visit.api";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Leaf,
  Calendar,
  RefreshCw,
  Clock,
  AlertCircle,
  TrendingUp,
  MapPin,
  Radio,
  Sprout,
  LandPlot,
  AlertTriangle,
  Users,
  CalendarCheck,
  ChevronRight,
  Eye,
} from "lucide-react";

/* ================================================================
   LEAFLET CUSTOM MARKER
   ================================================================ */
const createMarkerIcon = (isOnline) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${isOnline ? "#22c55e" : "#9ca3af"};
      border:2.5px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

/* ================================================================
   HELPERS
   ================================================================ */
const formatDate = (d) => {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (d) => {
  if (!d) return "\u2014";
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (s, e) => {
  if (!s || !e) return "\u2014";
  const ms = new Date(e) - new Date(s);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatRelative = (d) => {
  if (!d) return "\u2014";
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDate(d);
};

const normalizeStatus = (status) => {
  if (!status) return "pending";
  return status.toLowerCase();
};

/* ================================================================
   ANIMATED COUNT-UP HOOK
   ================================================================ */
const useCountUp = (target, duration = 1200) => {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const end = Number(target) || 0;
    if (start === end) { setVal(end); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + (end - start) * ease));
      if (p < 1) requestAnimationFrame(step);
      else prev.current = end;
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
};

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

/* ---- KPI STAT CARD ---- */
const StatCard = ({ icon: Icon, label, value, gradient, iconBg, iconColor, onClick, subValue }) => {
  const animVal = useCountUp(value);
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl p-5 overflow-hidden group card-hover
        hover:-translate-y-0.5 transition-all duration-300 ${onClick ? "cursor-pointer" : "cursor-default"}`}
      style={{
        background: gradient,
        boxShadow: "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)",
        border: "1px solid rgba(15,118,110,0.07)",
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: iconColor }} />
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.07]" style={{ background: iconColor }} />
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
            style={{ background: iconBg, color: iconColor }}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-[28px] font-bold text-gray-900 leading-none tabular-nums tracking-tight">{animVal}</p>
          <p className="mt-1.5 text-[13px] text-gray-500 font-medium">{label}</p>
          {subValue && (
            <p className="mt-1 text-[11px] font-semibold" style={{ color: iconColor }}>{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---- Status Badge ---- */
const StatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);
  const map = {
    completed: { c: "bg-emerald-50 text-emerald-700 border-emerald-100", d: "bg-emerald-500", label: "Completed" },
    verified: { c: "bg-emerald-50 text-emerald-700 border-emerald-100", d: "bg-emerald-500", label: "Verified" },
    active: { c: "bg-sky-50 text-sky-700 border-sky-100", d: "bg-sky-500", label: "Active" },
    in_progress: { c: "bg-sky-50 text-sky-700 border-sky-100", d: "bg-sky-500", label: "In Progress" },
    pending: { c: "bg-amber-50 text-amber-700 border-amber-100", d: "bg-amber-500", label: "Pending" },
    done: { c: "bg-emerald-50 text-emerald-700 border-emerald-100", d: "bg-emerald-500", label: "Done" },
    cancelled: { c: "bg-gray-50 text-gray-600 border-gray-200", d: "bg-gray-400", label: "Cancelled" },
  };
  const s = map[normalized] || map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${s.c}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.d}`} />
      {s.label}
    </span>
  );
};

/* ---- Section Header ---- */
const SectionHeader = ({ icon: Icon, title, subtitle, right }) => (
  <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: "linear-gradient(135deg, #f8fffe 0%, #f0fdf4 100%)", borderColor: "rgba(15,118,110,0.07)" }}>
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 ring-1 ring-emerald-100">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {right}
  </div>
);

/* ---- Tooltip for charts ---- */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const StableResponsiveContainer = ({ children }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) return <div className="w-full h-full" />;

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
      {children}
    </ResponsiveContainer>
  );
};

/* ================================================================
   DASHBOARD COMPONENT
   ================================================================ */
const CHART_COLORS = ["#15803d", "#22c55e", "#2563eb", "#ca8a04", "#dc2626", "#7c3aed", "#ea580c", "#0891b2", "#db2777"];

const Dashboard = () => {
  const navigate = useNavigate();
  // Add new stats for visit dashboard, keep old for existing cards
  const [stats, setStats] = useState({
    farmers: 0,
    fields: 0,
    visits: 0,
    issues_open: 0,
    totalVisits: 0,
    todayVisits: 0,
    activeEmployees: 0
  });
  const [farmersPerDistrict, setFarmersPerDistrict] = useState([]);
  const [visitsPerMonth, setVisitsPerMonth] = useState([]);
  const [cropDistribution, setCropDistribution] = useState([]);
  const [geoData, setGeoData] = useState([]);
  const [workdays, setWorkdays] = useState([]);
  const [recentVisits, setRecentVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);

      const [summaryR, chartR, trendsR, geoR, wdR, visitsR] = await Promise.allSettled([
        getDashboardStats(),
        getDashboardChartStats(),
        getVisitTrends(),
        getEmployeeGeo(),
        getWorkdayHistory(),
        getVisits({ ordering: "-created_at", limit: 8 }),
      ]);

      const isValid = (r) =>
        r.status === "fulfilled" && r.value !== undefined && r.value !== null && typeof r.value !== "string";

      // -- Summary: total_visits, today_visits, active_employees --
      if (isValid(summaryR)) {
        const res = summaryR.value;
        const d = res.data?.data ?? res.data ?? {};
        console.log("Dashboard summary:", d);
        setStats((prev) => ({
          ...prev,
          totalVisits: d.total_visits ?? prev.totalVisits,
          todayVisits: d.today_visits ?? prev.todayVisits,
          activeEmployees: d.active_employees ?? prev.activeEmployees,
          // summary may also carry these
          farmers: d.total_farmers ?? prev.farmers,
          fields: d.total_fields ?? prev.fields,
          issues_open: d.open_issues ?? d.total_open_issues ?? prev.issues_open,
        }));
      }

      // -- Chart stats: KPI counts + farmers_per_district + crop_distribution --
      if (isValid(chartR)) {
        const res = chartR.value;
        const d = res.data?.data ?? res.data ?? {};
        console.log("Dashboard chart stats:", d);

        setStats((prev) => ({
          ...prev,
          farmers: d.total_farmers ?? d.farmers_count ?? prev.farmers,
          fields: d.total_fields ?? d.fields_count ?? prev.fields,
          issues_open: d.open_issues ?? d.total_open_issues ?? d.issues_open ?? prev.issues_open,
          totalVisits: d.total_visits ?? prev.totalVisits,
        }));

        // Farmers per district
        const fpd = d.farmers_per_district ?? d.district_farmers ?? d.per_district ?? [];
        if (Array.isArray(fpd) && fpd.length > 0) {
          setFarmersPerDistrict(
            fpd.map((x) => ({
              name: x.name ?? x.district_name ?? x.district ?? "Unknown",
              count: x.count ?? x.farmer_count ?? x.total ?? 0,
            }))
          );
        }

        // Crop distribution
        const crops = d.crop_distribution ?? d.crops ?? d.crop_stats ?? [];
        if (Array.isArray(crops) && crops.length > 0) {
          setCropDistribution(
            crops.map((x) => ({
              name: x.name ?? x.crop_name ?? x.crop ?? "Unknown",
              count: x.count ?? x.field_count ?? x.total ?? 0,
            }))
          );
        }
      }

      // -- Visit trends: monthly counts --
      if (isValid(trendsR)) {
        const res = trendsR.value;
        const raw = res.data?.data ?? res.data ?? res;
        const monthly = Array.isArray(raw)
          ? raw
          : (raw.monthly ?? raw.visits_per_month ?? raw.monthly_visits ?? raw.data ?? []);
        if (Array.isArray(monthly) && monthly.length > 0) {
          setVisitsPerMonth(
            monthly.map((x) => ({
              month: x.month ?? x.period ?? x.label ?? x.month_label ?? "ï¿½",
              count: x.count ?? x.visits ?? x.total ?? 0,
            }))
          );
        }
      }

      if (isValid(geoR)) {
        setGeoData(resolveList(geoR.value));
      }

      if (isValid(wdR)) {
        setWorkdays(resolveList(wdR.value));
      }

      if (isValid(visitsR)) {
        const arr = Array.isArray(visitsR.value) ? visitsR.value : [];
        setRecentVisits(arr.slice(0, 8));
      }

      const allResults = [summaryR, chartR, trendsR, geoR, wdR, visitsR];
      const forbidden = allResults.filter((r) => r.status === "rejected" && r.reason?.response?.status === 403);
      if (forbidden.length > 0) {
        setError(`Access denied on ${forbidden.length} endpoint(s). Your account may lack admin permissions.`);
      } else {
        setError(null);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const id = setInterval(() => loadDashboard(), 30000);
    return () => clearInterval(id);
  }, [loadDashboard]);

  /* ---- Map center ---- */
  const mapCenter = (() => {
    const coords = geoData
      .filter((f) => f?.geometry?.coordinates?.length === 2)
      .map((f) => f.geometry.coordinates);
    if (coords.length === 0) return [12.95, 79.13];
    const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    return [lat, lng];
  })();

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="relative mx-auto w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
          </div>
          <p className="mt-4 text-sm text-gray-500 font-medium">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="page-container">
      {/* ================== PAGE HEADER ================== */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" ï¿½ "} Real-time operations overview
          </p>
        </div>
        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="btn btn-secondary btn-md disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing\u2026" : "Refresh"}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{error}</span>
          <button
            onClick={() => loadDashboard(true)}
            className="ml-auto font-semibold text-red-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ================== KPI CARDS ================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Sprout}
          label="Total Farmers"
          value={stats.farmers}
          gradient="linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)"
          iconBg="#dcfce7"
          iconColor="#15803d"
          onClick={() => navigate("/farmers")}
        />
        <StatCard
          icon={LandPlot}
          label="Total Fields"
          value={stats.fields}
          gradient="linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)"
          iconBg="#dbeafe"
          iconColor="#2563eb"
        />
        <StatCard
          icon={Calendar}
          label="Total Visits"
          value={stats.totalVisits}
          gradient="linear-gradient(135deg, #ffffff 0%, #fefce8 100%)"
          iconBg="#fef9c3"
          iconColor="#ca8a04"
          onClick={() => navigate("/visits")}
          subValue={stats.todayVisits > 0 ? `${stats.todayVisits} today` : undefined}
        />
        <StatCard
          icon={AlertTriangle}
          label="Open Issues"
          value={stats.issues_open}
          gradient="linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)"
          iconBg="#fee2e2"
          iconColor="#dc2626"
          onClick={() => navigate("/issues")}
        />
        <StatCard
          icon={CalendarCheck}
          label="Today's Visits"
          value={stats.todayVisits}
          gradient="linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)"
          iconBg="#ede9fe"
          iconColor="#7c3aed"
          onClick={() => navigate("/visits")}
        />
        <StatCard
          icon={Users}
          label="Active Employees"
          value={stats.activeEmployees}
          gradient="linear-gradient(135deg, #ffffff 0%, #ecfeff 100%)"
          iconBg="#cffafe"
          iconColor="#0e7490"
          onClick={() => navigate("/employees")}
        />
      </div>

      {/* ================== MAP + WORKDAY ================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Map */}
        <div
          className="lg:col-span-2 bg-white rounded-2xl overflow-hidden"
          style={{
            boxShadow: "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)",
            border: "1px solid rgba(15,118,110,0.08)",
          }}
        >
          <SectionHeader
            icon={MapPin}
            title="Live Field Map"
            subtitle={`${geoData.length} employee${geoData.length !== 1 ? "s" : ""} tracked`}
            right={
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                    Offline
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                  <span className="text-[11px] font-semibold text-emerald-700">LIVE</span>
                </div>
              </div>
            }
          />
          <div className="relative" style={{ height: 380 }}>
            {/* Top gradient overlay */}
            <div
              className="absolute top-0 left-0 right-0 h-8 z-[400] pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.6), transparent)",
              }}
            />
            <MapContainer
              center={mapCenter}
              zoom={10}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {geoData
                .filter((f) => f?.geometry?.coordinates?.length === 2)
                .map((feature, i) => {
                  const [lng, lat] = feature.geometry.coordinates;
                  const p = feature.properties || {};
                  const online = p.is_online !== false;
                  return (
                    <Marker
                      key={i}
                      position={[lat, lng]}
                      icon={createMarkerIcon(online)}
                    >
                      <Popup>
                        <div style={{ minWidth: 180, fontSize: 13, lineHeight: 1.6 }}>
                          <p style={{ fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                            {p.name || "Agent"}
                          </p>
                          {p.phone && (
                            <p style={{ color: "#6B7280" }}>Phone: {p.phone}</p>
                          )}
                          <p style={{ color: "#6B7280" }}>
                            Last seen: {formatRelative(p.last_heartbeat)}
                          </p>
                          {p.gps_accuracy != null && (
                            <p style={{ color: "#6B7280" }}>
                              Accuracy: &plusmn;{p.gps_accuracy}m
                            </p>
                          )}
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: 6,
                              padding: "2px 10px",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              background: online ? "#ECFDF5" : "#F3F4F6",
                              color: online ? "#065F46" : "#4B5563",
                            }}
                          >
                            {online ? "Online" : "Offline"}
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>
        </div>

        {/* Workday Activity */}
        <div
          className="bg-white rounded-2xl overflow-hidden flex flex-col"
          style={{
            boxShadow: "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)",
            border: "1px solid rgba(15,118,110,0.08)",
          }}
        >
          <SectionHeader
            icon={Clock}
            title="Workday Activity"
            subtitle="Recent sessions"
          />
          <div
            className="flex-1 overflow-y-auto px-4 py-3"
            style={{ maxHeight: 340, scrollbarWidth: "thin" }}
          >
            {workdays.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">
                  No activity yet
                </p>
                <p className="text-xs text-gray-400 mt-1 text-center max-w-[180px]">
                  Workday sessions will appear here once employees start tracking.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {workdays.slice(0, 10).map((wd, i) => {
                  const isComplete = !!wd.end_time;
                  const dotColor = wd.status === "active" || !isComplete
                    ? "bg-sky-500"
                    : "bg-emerald-500";
                  const lineColor = i < 9 ? "border-gray-200" : "border-transparent";
                  return (
                    <div
                      key={wd.id || i}
                      className={`relative pl-7 pb-3 border-l-2 ${lineColor} ml-1`}
                    >
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-[-5px] top-3 w-2.5 h-2.5 rounded-full ${dotColor}
                          ring-[3px] ring-white shadow-sm`}
                      />
                      <div className="rounded-xl p-3 hover:bg-gray-50/80 transition-all duration-200 group cursor-default">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          {/* Profile circle */}
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-white">
                              {(wd.employee?.first_name?.[0] || wd.employee?.username?.[0] || "E").toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate flex-1">
                            {wd.employee?.first_name ||
                              wd.employee?.username ||
                              "Employee"}
                          </p>
                          <StatusBadge
                            status={
                              wd.status || (isComplete ? "completed" : "active")
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 pl-8">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{formatTime(wd.start_time)}</span>
                          {wd.end_time && (
                            <>
                              <span className="text-gray-300">&rarr;</span>
                              <span>{formatTime(wd.end_time)}</span>
                              <span className="font-semibold text-emerald-600">
                                {formatDuration(wd.start_time, wd.end_time)}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 pl-8">
                          {formatDate(wd.start_time)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================== CHARTS ROW 1 ================== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Farmers per District */}
        <div className="lg:col-span-3 bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)", border: "1px solid rgba(15,118,110,0.08)" }}>
          <SectionHeader icon={Sprout} title="Farmers per District" subtitle="Distribution across districts" />
          <div className="px-4 py-4" style={{ height: 300 }}>
            {farmersPerDistrict.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Sprout className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">No data available</p>
              </div>
            ) : (
              <StableResponsiveContainer>
                <BarChart data={farmersPerDistrict} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Farmers" fill="#15803d" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </StableResponsiveContainer>
            )}
          </div>
        </div>

        {/* Crop Distribution */}
        <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)", border: "1px solid rgba(15,118,110,0.08)" }}>
          <SectionHeader icon={Leaf} title="Crop Distribution" subtitle="Crop types across fields" />
          <div className="px-4 py-4" style={{ height: 300 }}>
            {cropDistribution.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Leaf className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">No data available</p>
              </div>
            ) : (
              <StableResponsiveContainer>
                <PieChart>
                  <Pie data={cropDistribution} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="count" nameKey="name" paddingAngle={3} stroke="none">
                    {cropDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </StableResponsiveContainer>
            )}
            {cropDistribution.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2 pb-2 -mt-2">
                {cropDistribution.slice(0, 6).map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
                    <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================== CHART ROW 2 ï¿½ Visits per Month ================== */}
      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)", border: "1px solid rgba(15,118,110,0.08)" }}>
        <SectionHeader icon={TrendingUp} title="Visits per Month" subtitle="Monthly visit trends" />
        <div className="px-4 py-4" style={{ height: 300 }}>
          {visitsPerMonth.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Calendar className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No visit data available</p>
            </div>
          ) : (
            <StableResponsiveContainer>
              <AreaChart data={visitsPerMonth} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="visitMonthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#15803d" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#15803d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" name="Visits" stroke="#15803d" strokeWidth={2.5} fill="url(#visitMonthGrad)"
                  dot={{ r: 4, fill: "#15803d", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#15803d", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </StableResponsiveContainer>
          )}
        </div>
      </div>

      {/* ================== RECENT VISITS ================== */}
      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)", border: "1px solid rgba(15,118,110,0.08)" }}>
        <SectionHeader
          icon={Eye}
          title="Recent Visits"
          subtitle="Latest field activity"
          right={
            <button
              onClick={() => navigate("/visits")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
        />
        {recentVisits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-400">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No visits yet</p>
            <p className="text-xs text-gray-400 mt-1">Field visits will appear here once recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Farmer</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Employee</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Crop</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Village</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentVisits.map((v, i) => (
                  <tr
                    key={v.id || i}
                    className="hover:bg-emerald-50/30 transition-colors duration-150 cursor-pointer group"
                    onClick={() => navigate(`/visits/${v.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-white">
                            {(v.farmer_name ?? v.farmer?.name ?? "F")[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800 truncate max-w-[130px]">
                          {v.farmer_name ?? v.farmer?.name ?? "\u2014"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell text-gray-500 text-xs">
                      {v.employee?.first_name ?? v.employee?.username ?? "\u2014"}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[11px] font-medium border border-green-100">
                        <Leaf className="w-3 h-3" />
                        {v.crop?.name_en ?? v.crop_name ?? "\u2014"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-gray-500 text-xs">
                      {v.village?.name ?? v.village_name ?? "\u2014"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(v.created_at ?? v.visit_date ?? v.start_time)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-600 transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;



