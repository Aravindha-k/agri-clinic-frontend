import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { unwrapSuccessEnvelope, resolveList } from "../utils/apiUnwrap";
import { useNavigate } from "react-router-dom";
import { getDashboardStats, getDashboardChartStats, getVisitTrends } from "../api/dashboard.api";
import {
  getEmployeeGeo,
  getWorkdayHistory,
  getDashboardStats as getTrackingDashboardStats,
} from "../api/tracking.api";
import {
  resolveGeoFeatures,
  normalizeTrackingStats,
} from "../utils/trackingNormalize";
import {
  resolveVisitFarmer,
  normalizeVisitList,
  visitWhenLabel,
  visitEmployeeLabel,
} from "../utils/visitFarmer";
import { resolveCropLabel, resolveVillageLabel } from "../utils/displayValue";
import { PageHeader, PageLoader, OpsStatusBadge, GpsIndicator } from "../components/ui/command";
import ChartContainer from "../components/ui/ChartContainer";
import { getVisits } from "../api/visit.api";
import { useAdaptivePolling } from "../hooks/useAdaptivePolling";
import {
  recordApiFailure,
  recordApiSuccess,
  isUnreachableError,
} from "../utils/apiBackoff";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import MapEmployeeViewport from "../components/map/MapEmployeeViewport";
import {
  getValidEmployeeLocations,
  getMapCenter,
} from "../utils/mapCoordinates";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
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

/* ================================================================
   DASHBOARD COMPONENT
   ================================================================ */
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
    activeEmployees: 0,
    workingNow: 0,
    onlineNow: 0,
    gpsIssues: 0,
  });
  const [visitTrends, setVisitTrends] = useState([]);
  const [geoData, setGeoData] = useState([]);
  const [workdays, setWorkdays] = useState([]);
  const [recentVisits, setRecentVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const logApiFailure = (endpoint, result) => {
    const err = result.reason;
    console.error(
      `[Dashboard] ${endpoint} failed:`,
      err?.response?.status ?? "no status",
      err?.message ?? err
    );
  };

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    const [summaryR, chartR, trendsR, geoR, wdR, visitsR, trackingR] = await Promise.allSettled([
      getDashboardStats(),
      getDashboardChartStats(),
      getVisitTrends(),
      getEmployeeGeo(),
      getWorkdayHistory(),
      getVisits({ ordering: "-created_at", limit: 8 }),
      getTrackingDashboardStats(),
    ]);

    const summaryErr = summaryR.status === "rejected" ? summaryR.reason : null;
    if (isUnreachableError(summaryErr)) {
      recordApiFailure(summaryErr);
    }

    // -- Main summary (required) — GET dashboard/summary/ --
    if (summaryR.status === "fulfilled") {
      recordApiSuccess();
      const d = unwrapSuccessEnvelope(summaryR.value) ?? {};
      setStats((prev) => ({
        ...prev,
        totalVisits: d.total_visits ?? prev.totalVisits,
        todayVisits: d.today_visits ?? prev.todayVisits,
        activeEmployees: d.active_employees ?? prev.activeEmployees,
        farmers: d.total_farmers ?? prev.farmers,
        fields: d.total_fields ?? prev.fields,
        issues_open: d.open_issues ?? d.total_open_issues ?? prev.issues_open,
      }));
      setError(null);
    } else {
      logApiFailure("GET dashboard/summary/", summaryR);
      if (isUnreachableError(summaryErr)) {
        setError(
          import.meta.env.PROD
            ? "Backend unavailable. Check the production API is running and refresh."
            : "Backend unavailable. Start Django on port 8000 (see terminal) and refresh."
        );
      } else {
        setError("Failed to load dashboard summary. Check your connection and try again.");
      }
    }

    // -- Chart stats (optional) — GET dashboard/stats/ --
    if (chartR.status === "fulfilled") {
      const d = unwrapSuccessEnvelope(chartR.value) ?? {};
      setStats((prev) => ({
        ...prev,
        farmers: d.total_farmers ?? d.farmers ?? d.farmers_count ?? prev.farmers,
        fields: d.total_fields ?? d.fields ?? d.fields_count ?? prev.fields,
        issues_open: d.open_issues ?? d.issues_open ?? d.total_open_issues ?? prev.issues_open,
        totalVisits: d.total_visits ?? d.visits ?? prev.totalVisits,
      }));
    } else {
      logApiFailure("GET dashboard/stats/", chartR);
    }

    // -- Live tracking KPIs (optional) — GET tracking/admin/dashboard-stats/ --
    if (trackingR.status === "fulfilled" && trackingR.value != null) {
      const tk = normalizeTrackingStats(trackingR.value);
      setStats((prev) => ({
        ...prev,
        workingNow: tk.working_now,
        onlineNow: tk.online,
        gpsIssues: tk.gps_issues,
        totalEmployees: tk.total_employees,
      }));
    } else if (trackingR.status === "rejected") {
      logApiFailure("GET tracking/admin/dashboard-stats/", trackingR);
    }

    // -- Visit trends (optional) — GET dashboard/visit-trends/ --
    if (trendsR.status === "fulfilled") {
      const raw = unwrapSuccessEnvelope(trendsR.value) ?? {};
      const daily = Array.isArray(raw)
        ? raw
        : (raw.daily ?? raw.monthly ?? raw.visits_per_month ?? raw.monthly_visits ?? raw.data ?? []);
      if (Array.isArray(daily) && daily.length > 0) {
        setVisitTrends(
          daily.map((x) => {
            const rawDate = x.visit_date ?? x.month ?? x.period ?? x.label;
            const label =
              x.month_label ??
              (rawDate
                ? new Date(rawDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                : "—");
            return {
              label,
              count: x.count ?? x.visits ?? x.total ?? 0,
            };
          })
        );
      } else {
        setVisitTrends([]);
      }
    } else {
      logApiFailure("GET dashboard/visit-trends/", trendsR);
      setVisitTrends([]);
    }

    // -- Geo map (optional) — GET tracking/admin/geo/employees/ --
    if (geoR.status === "fulfilled") {
      const features = resolveGeoFeatures(geoR.value);
      setGeoData(features);
      console.log("[admin] map valid coordinates count", getValidEmployeeLocations(features).length);
    } else {
      logApiFailure("GET tracking/admin/geo/employees/", geoR);
      setGeoData([]);
    }

    // -- Workday history (optional) — GET tracking/workdays/history/ --
    if (wdR.status === "fulfilled") {
      setWorkdays(resolveList(wdR.value));
    } else {
      logApiFailure("GET tracking/workdays/history/", wdR);
      setWorkdays([]);
    }

    // -- Recent visits (optional) — GET visits/ --
    if (visitsR.status === "fulfilled") {
      const body = visitsR.value ?? {};
      const arr = body.results ?? resolveList(body);
      setRecentVisits(normalizeVisitList(arr).slice(0, 8));
    } else {
      logApiFailure("GET visits/", visitsR);
      setRecentVisits([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useAdaptivePolling(loadDashboard, 30000, [loadDashboard]);

  const validLocations = useMemo(
    () => getValidEmployeeLocations(geoData),
    [geoData]
  );
  const { center: mapCenter, zoom: mapZoom } = useMemo(
    () => getMapCenter(validLocations),
    [validLocations]
  );
  const mappedGeoCount = validLocations.length;
  const hasTrackedEmployees =
    geoData.length > 0 ||
    stats.totalEmployees > 0 ||
    stats.activeEmployees > 0 ||
    stats.onlineNow > 0;
  const mapStatusText =
    mappedGeoCount > 0
      ? "Showing latest employee location"
      : hasTrackedEmployees
        ? "No valid employee GPS location available yet."
        : null;

  /* ---- Loading state ---- */
  if (loading) {
    return <PageLoader label="Loading command center…" />;
  }

  /* ---- Render ---- */
  return (
    <div className="page-container">
      {/* ================== PAGE HEADER ================== */}
      <PageHeader
        title="Command Center"
        subtitle={`${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Real-time operations`}
        badge={<span className="command-hero-badge"><Radio className="w-3 h-3" /> Live ops</span>}
        actions={
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="btn btn-secondary btn-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

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
          onClick={() => navigate("/crop-issues")}
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
          label="Working Now"
          value={stats.workingNow}
          gradient="linear-gradient(135deg, #ffffff 0%, #ecfeff 100%)"
          iconBg="#cffafe"
          iconColor="#0e7490"
          onClick={() => navigate("/tracking")}
          subValue={
            stats.activeEmployees > 0
              ? `${stats.activeEmployees} active staff`
              : stats.onlineNow > 0
                ? `${stats.onlineNow} online`
                : undefined
          }
        />
      </div>

      {(stats.workingNow > 0 || stats.onlineNow > 0 || stats.gpsIssues > 0) && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate("/tracking")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-sm font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            <Radio className="w-4 h-4" />
            {stats.workingNow} working · {stats.onlineNow} online
          </button>
          {stats.gpsIssues > 0 && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-100 text-sm font-medium text-red-700">
              <AlertTriangle className="w-4 h-4" />
              {stats.gpsIssues} GPS issue{stats.gpsIssues !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

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
            subtitle={
              mapStatusText ??
              `${mappedGeoCount} employee${mappedGeoCount !== 1 ? "s" : ""} on map · ${stats.workingNow} working`
            }
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
              zoom={mapZoom}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapEmployeeViewport locations={validLocations} />
              {validLocations.map((loc) => (
                <Marker
                  key={`${loc.userId ?? loc.employeeName}-${loc.lat}-${loc.lng}`}
                  position={[loc.lat, loc.lng]}
                  icon={createMarkerIcon(loc.isOnline)}
                >
                  <Popup>
                    <div style={{ minWidth: 180, fontSize: 13, lineHeight: 1.6 }}>
                      <p style={{ fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                        {loc.employeeName}
                      </p>
                      <p style={{ color: "#6B7280" }}>
                        Status: {loc.isOnline ? "Online" : "Offline"}
                      </p>
                      <p style={{ color: "#6B7280" }}>
                        Last updated: {formatRelative(loc.lastSeen)}
                      </p>
                      <p style={{ color: "#6B7280", fontFamily: "monospace", fontSize: 12 }}>
                        {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            {mappedGeoCount === 0 && (
              <div
                className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none"
                style={{ background: "rgba(255,255,255,0.75)" }}
              >
                <p className="text-sm font-medium text-gray-500 px-6 text-center">
                  {hasTrackedEmployees
                    ? "No valid employee GPS location available yet."
                    : "No employees with valid GPS coordinates right now. Locations appear after field agents start their workday and share location."}
                </p>
              </div>
            )}
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
                          <OpsStatusBadge
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

      {/* Visit trends — GET dashboard/visit-trends/ */}
      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)", border: "1px solid rgba(15,118,110,0.08)" }}>
        <SectionHeader icon={TrendingUp} title="Visit Activity" subtitle="Daily visits (last 30 days)" />
        <div className="px-4 py-4">
          {visitTrends.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full min-w-0 h-[300px] text-gray-400">
              <Calendar className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No visit trend data yet</p>
            </div>
          ) : (
            <ChartContainer>
              <AreaChart data={visitTrends} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="visitTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#15803d" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#15803d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" name="Visits" stroke="#15803d" strokeWidth={2.5} fill="url(#visitTrendGrad)"
                  dot={{ r: 3, fill: "#15803d", stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "#15803d", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ChartContainer>
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th className="hidden sm:table-cell">Employee</th>
                  <th className="hidden md:table-cell">Crop</th>
                  <th className="hidden lg:table-cell">Village</th>
                  <th>Date & time</th>
                  <th>GPS</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentVisits.map((v, i) => {
                  const rowFarmer = resolveVisitFarmer(v);
                  return (
                  <tr
                    key={v.id || i}
                    className="hover:bg-emerald-50/30 transition-colors duration-150 cursor-pointer group"
                    onClick={() => navigate(`/visits/${v.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-white">
                            {(rowFarmer.name !== "—" ? rowFarmer.name : "F")[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800 truncate max-w-[130px]">
                          {rowFarmer.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell text-gray-500 text-xs">
                      {visitEmployeeLabel(v)}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[11px] font-medium border border-green-100">
                        <Leaf className="w-3 h-3" />
                        {rowFarmer.cropName !== "\u2014" ? rowFarmer.cropName : resolveCropLabel(v?.crop)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-gray-500 text-xs">
                      {rowFarmer.village !== "\u2014" ? rowFarmer.village : resolveVillageLabel(v?.village)}
                    </td>
                    <td className="text-gray-500 text-xs whitespace-nowrap">
                      {visitWhenLabel(v) !== "—"
                        ? visitWhenLabel(v)
                        : formatDate(v.created_at ?? v.start_time)}
                    </td>
                    <td>
                      <GpsIndicator latitude={v.latitude} longitude={v.longitude} compact />
                    </td>
                    <td>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-600 transition-colors" />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;



