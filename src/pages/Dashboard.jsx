import React, { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { extractDashboardObject, extractDashboardList } from "../utils/dashboardData";
import { useNavigate } from "react-router-dom";
import { getDashboardStats, getDashboardChartStats, getVisitTrends } from "../api/dashboard.api";
import {
  getEmployeeGeo,
  getWorkdayHistory,
  getDashboardStats as getTrackingDashboardStats,
  getAdminStatus,
} from "../api/tracking.api";
import { getFarmers } from "../api/farmer.api";
import {
  resolveGeoFeatures,
  normalizeTrackingStats,
  resolveTrackingEmployeeList,
  normalizeTrackingEmployee,
} from "../utils/trackingNormalize";
import {
  buildLiveOpsStats,
  buildOpsAlerts,
  buildUnifiedActivityFeed,
} from "../utils/dashboardOps";
import {
  resolveVisitFarmer,
  normalizeVisitList,
  visitWhenLabel,
  visitEmployeeLabel,
} from "../utils/visitFarmer";
import { resolveVillageLabel } from "../utils/displayValue";
import { resolveVisitCropDisplay } from "../utils/visitDisplay";
import { PageHeader, PageLoader, OpsStatusBadge, GpsIndicator, EmptyState } from "../components/ui/command";
import ProfileAvatar from "../components/ui/ProfileAvatar";
import WidgetSuspenseFallback from "../components/dashboard/WidgetSuspenseFallback";
import { getVisits } from "../api/visit.api";
import { useAdaptivePolling } from "../hooks/useAdaptivePolling";
import {
  recordApiFailure,
  recordApiSuccess,
  isUnreachableError,
} from "../utils/apiBackoff";
import {
  getValidEmployeeLocations,
  getMapCenter,
} from "../utils/mapCoordinates";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";
import QuickActions from "../components/dashboard/QuickActions";
import LiveOperationsPanel from "../components/dashboard/LiveOperationsPanel";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import UnifiedActivityFeed from "../components/dashboard/UnifiedActivityFeed";
import {
  WidgetErrorBoundary,
  DashboardShellErrorBoundary,
} from "../components/dashboard/WidgetErrorBoundary";
import { resolveVisitAttachmentCount } from "../utils/visitAttachments";

const DashboardLiveMap = lazy(() => import("../components/dashboard/DashboardLiveMap"));
const DashboardVisitChart = lazy(() => import("../components/dashboard/DashboardVisitChart"));
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
  Route,
  Paperclip,
  Navigation,
} from "lucide-react";

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

const STABLE_FORMAT_RELATIVE = formatRelative;

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
      className={`mini-kpi-card group ${onClick ? "cursor-pointer" : "cursor-default"}`}
      style={{
        background: gradient,
        boxShadow: "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)",
        border: "1px solid rgba(15,118,110,0.07)",
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: iconColor }} />
      <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-[0.07]" style={{ background: iconColor }} />
      <div className="relative z-10">
        <div className="mini-kpi-icon" style={{ background: iconBg, color: iconColor }}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="mini-kpi-value">{animVal}</p>
        <p className="mini-kpi-label">{label}</p>
        {subValue && (
          <p className="mt-1 text-[10px] font-semibold" style={{ color: iconColor }}>{subValue}</p>
        )}
      </div>
    </div>
  );
};

/* ---- Section Header ---- */
const SectionHeader = ({ icon: Icon, title, subtitle, right }) => (
  <div className="section-card-header">
    <div className="flex items-center gap-2.5 min-w-0">
      {Icon && (
        <div className="icon-box">
          <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </div>
      )}
      <div className="min-w-0">
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
    </div>
    {right}
  </div>
);


/* ================================================================
   HELPERS
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
  const [feedVisits, setFeedVisits] = useState([]);
  const [evidenceStats, setEvidenceStats] = useState({
    withEvidence: 0,
    totalAttachments: 0,
    rate: 0,
  });
  const [trackingEmployees, setTrackingEmployees] = useState([]);
  const [recentFarmers, setRecentFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadInFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.debug(
      `[Dashboard] render #${renderCountRef.current} loading=${loading} refreshing=${refreshing}`
    );
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.debug(`[Dashboard] loading transition -> ${loading}`);
  }, [loading]);

  const logApiFailure = (endpoint, result) => {
    if (!import.meta.env.DEV) return;
    const err = result.reason;
    console.error(
      `[Dashboard] ${endpoint} failed:`,
      err?.response?.status ?? "no status",
      err?.message ?? err
    );
  };

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (loadInFlightRef.current) {
      if (import.meta.env.DEV) {
        console.debug("[Dashboard] loadDashboard skipped — already in flight");
      }
      return;
    }
    loadInFlightRef.current = true;

    if (isRefresh) {
      setRefreshing(true);
    } else if (!hasLoadedRef.current) {
      setLoading(true);
    }

    try {
    const [summaryR, chartR, trendsR, geoR, wdR, visitsR, trackingR, adminR, farmersR] = await Promise.allSettled([
      getDashboardStats(),
      getDashboardChartStats(),
      getVisitTrends(),
      getEmployeeGeo(),
      getWorkdayHistory(),
      getVisits({ ordering: "-created_at", page_size: 100 }),
      getTrackingDashboardStats(),
      getAdminStatus(),
      getFarmers({ ordering: "-created_at", page_size: 10 }),
    ]);

    const summaryErr = summaryR.status === "rejected" ? summaryR.reason : null;
    if (isUnreachableError(summaryErr)) {
      recordApiFailure(summaryErr);
    }

    // -- Main summary (required) — GET dashboard/summary/ --
    if (summaryR.status === "fulfilled") {
      recordApiSuccess();
      const d = extractDashboardObject(summaryR.value) ?? {};
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
      const d = extractDashboardObject(chartR.value) ?? {};
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
      const raw = extractDashboardObject(trendsR.value) ?? {};
      const daily = Array.isArray(raw)
        ? raw
        : (raw.daily ??
          raw.monthly ??
          raw.visits_per_month ??
          raw.monthly_visits ??
          raw.results ??
          raw.data ??
          []);
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
    } else {
      logApiFailure("GET tracking/admin/geo/employees/", geoR);
      setGeoData([]);
    }

    // -- Workday history (optional) — GET tracking/workdays/history/ --
    if (wdR.status === "fulfilled") {
      setWorkdays(extractDashboardList(wdR.value));
    } else {
      logApiFailure("GET tracking/workdays/history/", wdR);
      setWorkdays([]);
    }

    // -- Recent visits (optional) — GET visits/ --
    if (visitsR.status === "fulfilled") {
      const arr = extractDashboardList(visitsR.value);
      const normalized = normalizeVisitList(Array.isArray(arr) ? arr : []);
      setRecentVisits(normalized.slice(0, 8));
      setFeedVisits(normalized);
      let withEvidence = 0;
      let totalAttachments = 0;
      normalized.forEach((v) => {
        const c = resolveVisitAttachmentCount(v);
        if (c != null && c > 0) {
          withEvidence += 1;
          totalAttachments += c;
        }
      });
      setEvidenceStats({
        withEvidence,
        totalAttachments,
        rate: normalized.length ? Math.round((withEvidence / normalized.length) * 100) : 0,
      });
    } else {
      logApiFailure("GET visits/", visitsR);
      setRecentVisits([]);
      setFeedVisits([]);
      setEvidenceStats({ withEvidence: 0, totalAttachments: 0, rate: 0 });
    }

    if (adminR.status === "fulfilled") {
      const list = resolveTrackingEmployeeList(adminR.value).map(normalizeTrackingEmployee);
      setTrackingEmployees(list);
    } else {
      logApiFailure("GET tracking/admin/status/", adminR);
      setTrackingEmployees([]);
    }

    if (farmersR.status === "fulfilled") {
      setRecentFarmers(extractDashboardList(farmersR.value));
    } else {
      setRecentFarmers([]);
    }

    hasLoadedRef.current = true;
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useAdaptivePolling(loadDashboard, 30000);

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

  const liveOps = useMemo(() => {
    try {
      return buildLiveOpsStats(stats ?? {}, trackingEmployees ?? [], workdays ?? []);
    } catch (err) {
      if (import.meta.env.DEV) console.error("[Dashboard] liveOps build failed:", err);
      return {};
    }
  }, [stats, trackingEmployees, workdays]);
  const opsAlerts = useMemo(() => {
    try {
      return buildOpsAlerts(trackingEmployees ?? [], workdays ?? []);
    } catch (err) {
      if (import.meta.env.DEV) console.error("[Dashboard] opsAlerts build failed:", err);
      return [];
    }
  }, [trackingEmployees, workdays]);
  const activityFeed = useMemo(() => {
    try {
      return buildUnifiedActivityFeed({
        workdays: workdays ?? [],
        visits: feedVisits ?? [],
        farmers: recentFarmers ?? [],
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error("[Dashboard] activityFeed build failed:", err);
      return [];
    }
  }, [workdays, feedVisits, recentFarmers]);

  /* ---- Loading state ---- */
  if (loading) {
    return <DashboardSkeleton />;
  }

  const pageHeader = (
      <PageHeader
        title="Dashboard"
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
  );

  /* ---- Render ---- */
  return (
    <DashboardShellErrorBoundary header={pageHeader}>
    <div className="page-container">
      {pageHeader}

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
      <div className="kpi-grid">
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
        <StatCard
          icon={Radio}
          label="GPS Online"
          value={stats.onlineNow}
          gradient="linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)"
          iconBg="#dcfce7"
          iconColor="#16a34a"
          onClick={() => navigate("/tracking")}
          subValue={mappedGeoCount > 0 ? `${mappedGeoCount} on map` : undefined}
        />
      </div>

      <WidgetErrorBoundary name="QuickActions" title="Quick Actions unavailable">
        <QuickActions />
      </WidgetErrorBoundary>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => navigate("/tracking/routes")}
          className="section-card p-4 text-left hover:border-emerald-200 transition-all group"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Route className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-800">Route Tracking Summary</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {stats.workingNow} working · {stats.onlineNow} GPS online · {mappedGeoCount} mapped
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 mt-2">
                View route history <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate("/visits")}
          className="section-card p-4 text-left hover:border-emerald-200 transition-all group"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Paperclip className="w-5 h-5 text-violet-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-800">Evidence Upload Summary</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {evidenceStats.withEvidence} visits with files · {evidenceStats.totalAttachments} attachments · {evidenceStats.rate}% rate
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 mt-2">
                Browse visits <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </button>
      </div>

      <WidgetErrorBoundary name="LiveOperations" title="Live Operations unavailable">
        <LiveOperationsPanel ops={liveOps ?? {}} />
      </WidgetErrorBoundary>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <WidgetErrorBoundary name="Alerts" title="Alerts unavailable">
          <AlertsPanel alerts={opsAlerts ?? []} />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary name="ActivityFeed" title="Activity feed unavailable">
          <UnifiedActivityFeed events={activityFeed ?? []} />
        </WidgetErrorBoundary>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <WidgetErrorBoundary
          name="LiveMap"
          title="Live Field Map unavailable"
          className="lg:col-span-2 min-h-[360px]"
        >
          <Suspense fallback={<WidgetSuspenseFallback label="Loading map\u2026" />}>
            <DashboardLiveMap
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              validLocations={validLocations ?? []}
              mappedGeoCount={mappedGeoCount}
              mapStatusText={mapStatusText}
              workingNow={stats.workingNow ?? 0}
              hasTrackedEmployees={hasTrackedEmployees}
              formatRelative={STABLE_FORMAT_RELATIVE}
            />
          </Suspense>
        </WidgetErrorBoundary>

        {/* Workday Activity */}
        <div
          className="section-card overflow-hidden flex flex-col"
          style={{
            boxShadow: "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)",
            border: "1px solid rgba(15,118,110,0.08)",
          }}
        >
          <SectionHeader
            icon={Clock}
            title="Recent Activity Feed"
            subtitle="Workday sessions & field activity"
          />
          <div
            className="flex-1 overflow-y-auto px-4 py-3"
            style={{ maxHeight: 280, scrollbarWidth: "thin" }}
          >
            {workdays.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center mb-4">
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
                          <ProfileAvatar entity={wd.employee} size="xs" />
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

      {/* Visit trends — lazy-loaded chart */}
      <WidgetErrorBoundary name="VisitChart" title="Visit chart unavailable">
        <Suspense fallback={<WidgetSuspenseFallback label="Loading analytics\u2026" />}>
          <DashboardVisitChart visitTrends={visitTrends ?? []} />
        </Suspense>
      </WidgetErrorBoundary>


      {/* ================== RECENT VISITS ================== */}
      <div className="section-card overflow-hidden"
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
          <EmptyState
            icon={Calendar}
            title="No visits yet"
            subtitle="Field visits will appear here once recorded."
            className="py-14"
          />
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
                        <ProfileAvatar
                          entity={v?.farmer ?? v}
                          src={rowFarmer.profilePhotoUrl}
                          name={rowFarmer.name !== "—" ? rowFarmer.name : "Farmer"}
                          size="xs"
                          variant="teal"
                        />
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
                        {rowFarmer.cropName !== "\u2014" ? rowFarmer.cropName : resolveVisitCropDisplay(v)}
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
    </DashboardShellErrorBoundary>
  );
};

export default Dashboard;

