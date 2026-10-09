import React, { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { motion, useReducedMotion, useMotionValue, useTransform, animate } from "framer-motion";
import { extractDashboardObject, extractDashboardList } from "../utils/dashboardData";
import { useNavigate } from "react-router-dom";
import { getDashboardStats, getDashboardChartStats } from "../api/dashboard.api";
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
import { farmerVillage } from "../utils/farmerListDisplay";
import { resolveVisitCropDisplay } from "../utils/visitDisplay";
import { PageHeader, OpsStatusBadge, GpsIndicator, EmptyState, ErrorRetry } from "../components/ui/command";
import ProfileAvatar from "../components/ui/ProfileAvatar";
import WidgetSuspenseFallback from "../components/dashboard/WidgetSuspenseFallback";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";
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
import QuickActions from "../components/dashboard/QuickActions";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import { KPI_THEMES } from "../theme/brand";
import UnifiedActivityFeed from "../components/dashboard/UnifiedActivityFeed";
import { formatIndiaDate, formatIndiaTime } from "../utils/businessDate";
import {
  WidgetErrorBoundary,
  DashboardShellErrorBoundary,
} from "../components/dashboard/WidgetErrorBoundary";
import { resolveVisitAttachmentCount } from "../utils/visitAttachments";

import PremiumKpiCard from "../components/ui/PremiumKpiCard";
const DashboardLiveMap = lazy(() => import("../components/dashboard/DashboardLiveMap"));
import {
  Leaf,
  Calendar,
  RefreshCw,
  Radio,
  Sprout,
  LandPlot,
  AlertTriangle,
  Users,
  CalendarCheck,
  ChevronRight,
  Eye,
  Search,
  Satellite,
} from "lucide-react";

const formatDate = (d) => formatIndiaDate(d);

const SEGMENTS = 10;

function SegmentedBar({ pct, light = false }) {
  const filled = Math.round(Math.min(1, Math.max(0, pct)) * SEGMENTS);
  return (
    <div
      className={`seg-bar${light ? " seg-bar--light" : ""}`}
      role="img"
      aria-label={`${Math.round(pct * 100)}%`}
    >
      {Array.from({ length: SEGMENTS }).map((_, i) => (
        <span key={i} className={`seg-bar__seg${i < filled ? " is-on" : ""}`} aria-hidden />
      ))}
    </div>
  );
}

const opsGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const formatTime = (d) => formatIndiaTime(d);

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
   SUB-COMPONENTS
   ================================================================ */

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
  const reduceMotion = useReducedMotion();
  const donutProgress = useMotionValue(0);
  const donutPctText = useTransform(donutProgress, (v) => `${Math.round(v)}%`);
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
  const [quickSearch, setQuickSearch] = useState("");
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
    // Render as soon as the KPI summary lands — the page must not wait
    // for the slowest optional feed (visits/geo/trends stream in after).
    const summaryR = await Promise.resolve(getDashboardStats()).then(
      (value) => ({ status: "fulfilled", value }),
      (reason) => ({ status: "rejected", reason })
    );
    const othersP = Promise.allSettled([
      getDashboardChartStats(),
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

    // Unlock the shell now — KPIs render while the remaining feeds stream in.
    hasLoadedRef.current = true;
    setLoading(false);

    const [chartR, geoR, wdR, visitsR, trackingR, adminR, farmersR] = await othersP;

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
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useAdaptivePolling(loadDashboard, 30000);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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

  const teamPerformance = useMemo(() => {
    const counts = new Map();
    (feedVisits ?? []).forEach((v) => {
      const name = visitEmployeeLabel(v);
      if (!name || name === "\u2014") return;
      const prev = counts.get(name) ?? { name, visits: 0 };
      prev.visits += 1;
      counts.set(name, prev);
    });
    const rows = [...counts.values()]
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5);
    const max = rows[0]?.visits ?? 0;
    return rows.map((r) => ({ ...r, pct: max > 0 ? r.visits / max : 0 }));
  }, [feedVisits]);

  const dutyAvatars = useMemo(() => {
    return (trackingEmployees ?? [])
      .filter((e) => e?.is_working || e?.is_online)
      .slice(0, 4);
  }, [trackingEmployees]);

  const gpsCompliancePct = useMemo(() => {
    const base = stats.workingNow > 0 ? stats.workingNow : stats.activeEmployees;
    if (!base || base <= 0) return stats.onlineNow > 0 ? 100 : 0;
    return Math.min(100, Math.round((stats.onlineNow / base) * 100));
  }, [stats.workingNow, stats.activeEmployees, stats.onlineNow]);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    const q = quickSearch.trim();
    navigate(q ? `/farmers?search=${encodeURIComponent(q)}` : "/farmers");
  };

  // Evidence donut sweep — draws the ring while the right column settles.
  useEffect(() => {
    const target = Math.min(100, Math.max(0, evidenceStats.rate));
    if (reduceMotion) {
      donutProgress.set(target);
      return undefined;
    }
    const controls = animate(donutProgress, target, {
      delay: 0.4,
      duration: 1.3,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [evidenceStats.rate, reduceMotion, donutProgress]);

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
    <div className="page-container page-container--dashboard">
      {pageHeader}

      {error && (
        <ErrorRetry
          compact
          message={error}
          onRetry={() => loadDashboard(true)}
          className="mb-4"
        />
      )}

      <motion.div
        className="dashboard-bento"
        style={{ transformOrigin: "0% 0%" }}
        initial={
          reduceMotion
            ? false
            : { scale: 1.15, x: 50, y: 40, filter: "blur(4px)" }
        }
        animate={{ scale: 1, x: 0, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      >
      <div className="dashboard-ops-band">
        <div className="dashboard-ops-band__lead">
          <div className="raised-icon-well raised-icon-well--emerald dashboard-ops-band__icon">
            <Sprout className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="dashboard-ops-band__greeting">{opsGreeting()}</p>
            <h2 className="dashboard-ops-band__title">Kavya Agri Clinic Operations</h2>
            <p className="dashboard-ops-band__sub">Today&apos;s field activity is live</p>
          </div>
        </div>
        <div className="dashboard-ops-band__actions">
          <form
            className="dashboard-ops-search"
            onSubmit={handleQuickSearch}
            role="search"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <input
              type="search"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Search farmers…"
              aria-label="Search farmers"
            />
          </form>
          {dutyAvatars.length > 0 && (
            <div className="dashboard-ops-avatars" title="On duty now">
              {dutyAvatars.map((emp, i) => (
                <ProfileAvatar
                  key={emp.user_id ?? emp.id ?? i}
                  entity={emp}
                  name={emp.employee_name ?? emp.name}
                  size="sm"
                  online={emp.is_online ?? emp.is_working}
                  className="dashboard-ops-avatar"
                />
              ))}
              {stats.workingNow > dutyAvatars.length && (
                <span className="dashboard-ops-avatar-more">
                  +{stats.workingNow - dutyAvatars.length}
                </span>
              )}
            </div>
          )}
          {(stats.workingNow > 0 || stats.onlineNow > 0) && (
            <div className="dashboard-ops-band__status">
              <button
                type="button"
                onClick={() => navigate("/tracking")}
                className="dashboard-ops-band__live"
              >
                <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                LIVE
              </button>
              <span className="dashboard-ops-band__meta">
                {stats.workingNow} working · {stats.onlineNow} GPS online
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-kpi-row">
        <PremiumKpiCard
          icon={Sprout}
          label="All Farmers"
          value={stats.farmers}
          gradient={KPI_THEMES.farmers.gradient}
          iconBg={KPI_THEMES.farmers.iconBg}
          iconColor={KPI_THEMES.farmers.iconColor}
          onClick={() => navigate("/farmers")}
          trend={{ direction: "neutral", text: "Registry total" }}
        />
        <PremiumKpiCard
          icon={LandPlot}
          label="Total Fields"
          value={stats.fields}
          gradient={KPI_THEMES.fields.gradient}
          iconBg={KPI_THEMES.fields.iconBg}
          iconColor={KPI_THEMES.fields.iconColor}
          trend={{ direction: "neutral", text: "Mapped fields" }}
        />
        <PremiumKpiCard
          icon={Calendar}
          label="Total Visits"
          value={stats.totalVisits}
          gradient={KPI_THEMES.visits.gradient}
          iconBg={KPI_THEMES.visits.iconBg}
          iconColor={KPI_THEMES.visits.iconColor}
          onClick={() => navigate("/visits")}
          subValue={stats.todayVisits > 0 ? `${stats.todayVisits} today` : undefined}
          trend={{ direction: "neutral", text: "All-time total" }}
        />
        <PremiumKpiCard
          icon={AlertTriangle}
          label="Open Issues"
          value={stats.issues_open}
          gradient={KPI_THEMES.issues.gradient}
          iconBg={KPI_THEMES.issues.iconBg}
          iconColor={KPI_THEMES.issues.iconColor}
          onClick={() => navigate("/crop-issues")}
          trend={
            stats.issues_open > 0
              ? { direction: "neutral", text: "Open now" }
              : { direction: "neutral", text: "None open" }
          }
        />
        <PremiumKpiCard
          icon={CalendarCheck}
          label="Today's Visits"
          value={stats.todayVisits}
          gradient={KPI_THEMES.today.gradient}
          iconBg={KPI_THEMES.today.iconBg}
          iconColor={KPI_THEMES.today.iconColor}
          onClick={() => navigate("/visits")}
          trend={
            stats.todayVisits > 0
              ? { direction: "neutral", text: "Submitted today" }
              : { direction: "neutral", text: "No visits yet" }
          }
        />
        <PremiumKpiCard
          icon={Users}
          label="Working Now"
          value={stats.workingNow}
          gradient={KPI_THEMES.working.gradient}
          iconBg={KPI_THEMES.working.iconBg}
          iconColor={KPI_THEMES.working.iconColor}
          onClick={() => navigate("/tracking")}
          subValue={
            stats.activeEmployees > 0
              ? `${stats.activeEmployees} active staff`
              : stats.onlineNow > 0
                ? `${stats.onlineNow} online`
                : undefined
          }
          trend={
            stats.workingNow > 0
              ? { direction: "neutral", text: "On duty now" }
              : { direction: "neutral", text: "None on duty" }
          }
        />
        <PremiumKpiCard
          icon={Radio}
          label="GPS Compliance"
          value={stats.onlineNow}
          gradient={KPI_THEMES.gps.gradient}
          iconBg={KPI_THEMES.gps.iconBg}
          iconColor={KPI_THEMES.gps.iconColor}
          onClick={() => navigate("/tracking")}
          subValue={
            stats.workingNow > 0
              ? `${Math.round((stats.onlineNow / stats.workingNow) * 100)}% online`
              : mappedGeoCount > 0
                ? `${mappedGeoCount} on map`
                : "Live GPS status"
          }
          trend={
            stats.gpsIssues > 0
              ? { direction: "neutral", text: `${stats.gpsIssues} GPS issues` }
              : { direction: "neutral", text: "Live snapshot" }
          }
        />
      </div>

      <div className="dashboard-main-row">
        <WidgetErrorBoundary name="Alerts" title="Alerts unavailable">
          <AlertsPanel alerts={opsAlerts ?? []} />
        </WidgetErrorBoundary>
        <motion.div
          className="dashboard-stack"
          initial={reduceMotion ? false : { opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="dashboard-section-card dashboard-perf-card dashboard-perf-card--accent">
            <div className="dashboard-perf-card__head">
              <p className="dashboard-perf-card__title dashboard-perf-card__title--light">
                GPS Compliance
              </p>
              <Satellite className="w-5 h-5 dashboard-accent__icon" aria-hidden="true" />
            </div>
            <p className="dashboard-accent__value">{gpsCompliancePct}%</p>
            <p className="dashboard-accent__meta">
              {stats.onlineNow} of {stats.workingNow || stats.activeEmployees || 0} staff
              GPS online
            </p>
            <SegmentedBar pct={gpsCompliancePct / 100} light />
            <button
              type="button"
              className="dashboard-accent__cta"
              onClick={() => navigate("/tracking")}
            >
              Open live map <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <WidgetErrorBoundary name="QuickActions" title="Quick Actions unavailable">
            <QuickActions />
          </WidgetErrorBoundary>
        </motion.div>
      </div>

      <div className="dashboard-perf-row">
        <div className="dashboard-section-card dashboard-perf-card">
          <div className="dashboard-perf-card__head">
            <p className="dashboard-perf-card__title">Visit Evidence</p>
            <span className="dashboard-perf-card__chip">Latest visits</span>
          </div>
          <motion.div
            className="dashboard-donut"
            style={{ "--p": donutProgress }}
          >
            <div className="dashboard-donut__center">
              <motion.span className="dashboard-donut__value">
                {donutPctText}
              </motion.span>
              <span className="dashboard-donut__label">with evidence</span>
            </div>
          </motion.div>
          <div className="dashboard-donut__legend">
            <span>
              <i className="dashboard-dot dashboard-dot--emerald" aria-hidden />
              {evidenceStats.withEvidence} with files
            </span>
            <span>
              <i className="dashboard-dot dashboard-dot--slate" aria-hidden />
              {Math.max(0, (feedVisits?.length ?? 0) - evidenceStats.withEvidence)} without
            </span>
          </div>
        </div>

        <div className="dashboard-section-card dashboard-perf-card dashboard-perf-card--team">
          <div className="dashboard-perf-card__head">
            <p className="dashboard-perf-card__title">Field Team Performance</p>
            <button
              type="button"
              className="dashboard-perf-card__link"
              onClick={() => navigate("/visits")}
            >
              All visits <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {teamPerformance.length === 0 ? (
            <p className="dashboard-perf-card__empty">
              Submitted visits will rank the field team here.
            </p>
          ) : (
            <ul className="dashboard-team-list">
              {teamPerformance.map((row, i) => (
                <li key={row.name}>
                  <button
                    type="button"
                    className="dashboard-team-row"
                    onClick={() => navigate("/visits")}
                  >
                    <span className="dashboard-team-row__rank">{i + 1}</span>
                    <ProfileAvatar
                      name={row.name}
                      size="sm"
                      variant={i % 2 ? "teal" : "emerald"}
                    />
                    <span className="dashboard-team-row__name" title={row.name}>
                      {row.name}
                    </span>
                    <SegmentedBar pct={row.pct} />
                    <span className="dashboard-team-row__count">
                      {row.visits} visit{row.visits !== 1 ? "s" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-section-card dashboard-perf-card dashboard-farmers-card">
          <div className="dashboard-perf-card__head">
            <p className="dashboard-perf-card__title">Newest Farmers</p>
            <button
              type="button"
              className="dashboard-perf-card__link"
              onClick={() => navigate("/farmers")}
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recentFarmers.length === 0 ? (
            <p className="dashboard-perf-card__empty">
              Newly registered farmers will appear here.
            </p>
          ) : (
            <ul className="dashboard-farmers-list">
              {recentFarmers.slice(0, 5).map((f) => (
                <li key={f.id ?? f.name}>
                  <button
                    type="button"
                    className="dashboard-farmer-row"
                    onClick={() => f.id && navigate(`/farmers/${f.id}`)}
                  >
                    <ProfileAvatar entity={f} name={f.name} size="sm" />
                    <span className="dashboard-farmer-row__main">
                      <span className="dashboard-farmer-row__name">
                        {f.name || "—"}
                      </span>
                      <span className="dashboard-farmer-row__sub">
                        {farmerVillage(f) || "Village not set"}
                      </span>
                    </span>
                    <span className="dashboard-farmer-row__date">
                      {formatDate(f.created_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="dashboard-main-row">
        <WidgetErrorBoundary
          name="LiveMap"
          title="Live Field Map unavailable"
          className="min-h-[360px]"
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
        <WidgetErrorBoundary name="ActivityFeed" title="Activity feed unavailable">
          <UnifiedActivityFeed events={activityFeed ?? []} />
        </WidgetErrorBoundary>
      </div>

      {/* ================== RECENT VISITS ================== */}
      <div className="dashboard-section-card overflow-hidden">
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
                    className="dashboard-visit-row hover:bg-emerald-50/30 transition-colors duration-150 cursor-pointer group"
                    style={{ "--row-i": Math.min(i, 7) }}
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
      </motion.div>
    </div>
    </DashboardShellErrorBoundary>
  );
};

export default Dashboard;

