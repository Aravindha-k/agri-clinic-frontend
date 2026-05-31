import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { getVisits } from "../api/visit.api";
import { getEmployeeGeo, getAdminStatus } from "../api/tracking.api";
import {
  PageHeader,
  PageLoader,
  EmptyState,
  FilterBar,
  SkeletonTable,
  ErrorRetry,
} from "../components/ui/command";
import { friendlyErrorMessage } from "../utils/friendlyError";
import RouteFallback from "../components/RouteFallback";
import ProfileAvatar from "../components/ui/ProfileAvatar";
import AnalyticsBarRow from "../components/reports/AnalyticsBarRow";
import ReportKpiCard from "../components/reports/ReportKpiCard";
import {
  formatGpsComplianceLabel,
  formatDistanceKm,
  ANALYTICS_TOOLTIPS,
} from "../utils/analyticsLabels";
import { BRAND } from "../theme/brand";
import {
  buildGpsComplianceAnalytics,
  buildRouteAnalytics,
  filterVisitsByDateRange,
  topEntries,
  exportVisitsCsv,
  exportVisitsExcel,
} from "../utils/reportsAnalytics";
import {
  resolveTrackingEmployeeList,
  normalizeTrackingEmployee,
} from "../utils/trackingNormalize";
import {
  resolveCropLabel,
  resolveEmployeeLabel,
  resolveVillageLabel,
  resolveFarmerLabel,
} from "../utils/displayValue";
import {
  BarChart3,
  Users,
  Leaf,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Download,
  Calendar,
  MapPin,
  Route,
  Paperclip,
  Navigation,
  ShieldCheck,
} from "lucide-react";

const ReportsRouteChart = lazy(() => import("../components/reports/ReportsRouteChart"));

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function getEmployeeName(item) {
  return item?.employee_name || resolveEmployeeLabel(item?.employee);
}

function getCropName(item) {
  return item?.crop_name || resolveCropLabel(item?.crop);
}

function getLocationName(item) {
  return (
    item?.village_name ||
    resolveVillageLabel(item?.village) ||
    item?.district_name ||
    "\u2014"
  );
}

function getVisitDate(item) {
  return item?.visit_date || item?.created_at || item?.timestamp || item?.start_time || null;
}

function normalizeReportRow(item, index) {
  return {
    ...item,
    id: item?.id ?? item?.visit_id ?? item?.report_id ?? index + 1,
    farmer_name: item?.farmer_name || resolveFarmerLabel(item?.farmer),
    crop: getCropName(item),
    employee: getEmployeeName(item),
    location_name: getLocationName(item),
    visit_date: getVisitDate(item),
    status: item?.status || item?.visit_status || "pending",
  };
}

function StatusBadge({ status }) {
  const s = (status || "completed").toLowerCase();
  const cfg = {
    verified: { cls: "badge badge-success", dot: "bg-emerald-500", label: "Verified" },
    completed: { cls: "badge badge-success", dot: "bg-emerald-500", label: "Completed" },
    pending: { cls: "badge badge-warning", dot: "bg-amber-500", label: "Pending" },
    in_progress: { cls: "badge badge-info", dot: "bg-sky-500", label: "In Progress" },
  };
  const c = cfg[s] || cfg.completed;
  return (
    <span className={c.cls}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function ReportSection({ icon: Icon, title, subtitle, children, action }) {
  return (
    <div className="section-card">
      <div className="section-card-header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="icon-box">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="section-title">{title}</h3>
            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function Reports() {
  const [data, setData] = useState([]);
  const [routeDistances, setRouteDistances] = useState([]);
  const [trackingEmployees, setTrackingEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(() => defaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => defaultDateRange().to);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [visitsR, geoR, adminR] = await Promise.allSettled([
        getVisits({ page_size: 500 }),
        getEmployeeGeo(),
        getAdminStatus(),
      ]);

      if (visitsR.status === "fulfilled") {
        const body = visitsR.value ?? {};
        const records = Array.isArray(body.results) ? body.results : [];
        setData(records.map(normalizeReportRow));
      } else {
        throw visitsR.reason;
      }

      if (geoR.status === "fulfilled") {
        const features = geoR.value?.features ?? [];
        const rows = features
          .map((f) => {
            const p = f.properties ?? f;
            const name =
              p.employee_name ||
              [p.first_name, p.last_name].filter(Boolean).join(" ") ||
              p.username ||
              "Employee";
            const km =
              p.today_distance_km ??
              p.distance_km ??
              p.total_distance_km ??
              null;
            return { name, km: km != null ? Number(km) : null };
          })
          .filter((r) => r.km != null && r.km > 0);
        setRouteDistances(rows);
      } else {
        setRouteDistances([]);
      }

      if (adminR.status === "fulfilled") {
        setTrackingEmployees(
          resolveTrackingEmployeeList(adminR.value).map(normalizeTrackingEmployee)
        );
      } else {
        setTrackingEmployees([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dateFiltered = useMemo(
    () => filterVisitsByDateRange(data, dateFrom, dateTo),
    [data, dateFrom, dateTo]
  );

  const analytics = useMemo(
    () => buildGpsComplianceAnalytics(dateFiltered, trackingEmployees),
    [dateFiltered, trackingEmployees]
  );

  const routeAnalytics = useMemo(
    () => buildRouteAnalytics(routeDistances),
    [routeDistances]
  );

  const routeChartData = useMemo(
    () =>
      routeAnalytics.mostActive.map((r) => ({
        label: r.name.split(" ")[0] || r.name,
        km: Number(r.km.toFixed(1)),
      })),
    [routeAnalytics]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return dateFiltered;
    const q = search.toLowerCase();
    return dateFiltered.filter(
      (r) =>
        (r.farmer_name || "").toLowerCase().includes(q) ||
        (r.crop || "").toLowerCase().includes(q) ||
        (r.employee || "").toLowerCase().includes(q) ||
        (r.location_name || "").toLowerCase().includes(q) ||
        String(r.id || "").includes(q)
    );
  }, [dateFiltered, search]);

  const totalRouteKm = routeAnalytics.totalKm;

  const kpis = [
    {
      icon: BarChart3,
      label: "Total Visits",
      value: analytics.totalVisits,
      description: "Field visits submitted in the selected date range",
      accent: BRAND.primary,
      gradient: "linear-gradient(135deg,#fff 0%,#f0fdf4 100%)",
      iconBg: "#dcfce7",
    },
    {
      icon: Users,
      label: "Farmers Served",
      value: analytics.totalFarmers,
      description: "Unique farmers visited at least once",
      accent: BRAND.primaryDark,
      gradient: "linear-gradient(135deg,#fff 0%,#ecfdf5 100%)",
      iconBg: "#d1fae5",
    },
    {
      icon: ShieldCheck,
      label: "GPS Tracking Compliance",
      value: formatGpsComplianceLabel(analytics.gpsCompliancePct),
      description: `${analytics.gpsCompliant} of ${analytics.totalVisits} visits include GPS coordinates`,
      tooltip: ANALYTICS_TOOLTIPS.gpsCompliance,
      accent: BRAND.info,
      gradient: "linear-gradient(135deg,#fff 0%,#ecfeff 100%)",
      iconBg: "#cffafe",
    },
    {
      icon: Paperclip,
      label: "Visits With Evidence",
      value: analytics.visitsWithEvidence,
      description: `${analytics.evidenceRatePct}% of visits include uploaded photos or files`,
      accent: BRAND.accent,
      gradient: "linear-gradient(135deg,#fff 0%,#f5f3ff 100%)",
      iconBg: "#ede9fe",
    },
  ];

  if (loading) {
    return (
      <div className="page-container space-y-4">
        <PageHeader title="Analytics & Reports" subtitle="Loading report data\u2026" />
        <SkeletonTable rows={8} cols={4} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Analytics & Reports"
        subtitle="Field visits, farmer coverage, GPS compliance, evidence uploads, and route activity"
        badge={
          <span className="command-hero-badge">
            <BarChart3 className="w-3 h-3" /> Operations
          </span>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => exportVisitsExcel(filtered)}
              disabled={!filtered.length}
              className="btn btn-secondary btn-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
            <button
              type="button"
              onClick={() => exportVisitsCsv(filtered)}
              disabled={!filtered.length}
              className="btn btn-secondary btn-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button type="button" onClick={() => load()} className="btn btn-primary btn-md">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </>
        }
      />

      {error && (
        <ErrorRetry
          compact
          message={friendlyErrorMessage(error, "Couldn't load reports. Please try again.")}
          onRetry={load}
        />
      )}

      <FilterBar>
        <div className="flex flex-col lg:flex-row gap-3 items-end">
          <div>
            <label htmlFor="report-from" className="block text-xs font-semibold text-gray-500 mb-1">
              From
            </label>
            <input
              id="report-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="search-input w-full sm:w-auto"
            />
          </div>
          <div>
            <label htmlFor="report-to" className="block text-xs font-semibold text-gray-500 mb-1">
              To
            </label>
            <input
              id="report-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="search-input w-full sm:w-auto"
            />
          </div>
          <p className="text-xs text-gray-500 lg:ml-auto pb-2">
            {dateFiltered.length} visits in selected range
          </p>
        </div>
      </FilterBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <ReportKpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportSection
          icon={UserCheck}
          title="Visits by Employee"
          subtitle="How field visits are distributed across your team"
        >
          {topEntries(analytics.visitsByEmployee).length === 0 ? (
            <EmptyState icon={Users} title="No visit data" subtitle="Visits will appear once field agents submit records." />
          ) : (
            <div className="space-y-3">
              {topEntries(analytics.visitsByEmployee).map(([name, count]) => (
                <AnalyticsBarRow
                  key={name}
                  label={name}
                  count={count}
                  total={analytics.totalVisits}
                  accent={CHART_COLORS.secondary}
                  variant="employee"
                />
              ))}
            </div>
          )}
        </ReportSection>

        <ReportSection
          icon={MapPin}
          title="Farmer Coverage"
          subtitle={`${analytics.totalFarmers} farmers reached across ${analytics.villagesCovered} villages`}
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-800 tabular-nums">{analytics.totalFarmers}</p>
              <p className="text-xs text-emerald-700 mt-1 font-medium">Farmers Served</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Unique farmers visited</p>
            </div>
            <div className="rounded-xl bg-sky-50 border border-sky-100 p-3 text-center">
              <p className="text-2xl font-bold text-sky-800 tabular-nums">{analytics.villagesCovered}</p>
              <p className="text-xs text-sky-700 mt-1 font-medium">Villages Covered</p>
              <p className="text-[10px] text-sky-600 mt-0.5">Villages with at least one visit</p>
            </div>
          </div>
          {topEntries(analytics.farmerCoverageByVillage, 5).length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Top villages by farmers served
              </p>
              {topEntries(analytics.farmerCoverageByVillage, 5).map(([village, count]) => (
                <AnalyticsBarRow
                  key={village}
                  label={village}
                  count={count}
                  total={analytics.totalFarmers}
                  variant="coverage"
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={MapPin} title="No village coverage yet" subtitle="Farmer coverage by village appears once visits include location data." />
          )}
          {Object.keys(analytics.cropTypes).length > 0 && (
            <div className="space-y-3 mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Visits by crop type
              </p>
              {topEntries(analytics.cropTypes, 5).map(([crop, count]) => (
                <AnalyticsBarRow
                  key={crop}
                  label={crop}
                  count={count}
                  total={analytics.totalVisits}
                  variant="crop"
                />
              ))}
            </div>
          )}
        </ReportSection>

        <ReportSection
          icon={ShieldCheck}
          title="GPS Compliance Report"
          subtitle={`${analytics.gpsCompliant} of ${analytics.totalVisits} visits include GPS location proof`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: `conic-gradient(#059669 ${analytics.gpsCompliancePct * 3.6}deg, #e5e7eb 0)`,
              }}
              title={ANALYTICS_TOOLTIPS.gpsCompliance}
            >
              <div className="w-14 h-14 rounded-full bg-white flex flex-col items-center justify-center px-1">
                <span className="text-sm font-bold text-emerald-700 leading-none">
                  {analytics.gpsCompliancePct}%
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1.5">
              <p className="font-semibold text-emerald-800">
                {formatGpsComplianceLabel(analytics.gpsCompliancePct)}
              </p>
              <p>
                <span className="font-semibold text-gray-900">{analytics.gpsCompliant}</span> visits with GPS coordinates recorded
              </p>
              <p>
                <span className="font-semibold text-gray-900">{analytics.gpsDisabledIncidents}</span> active GPS incidents right now
              </p>
              <p>
                Live tracking uptime:{" "}
                <span className="font-semibold text-emerald-700">{analytics.trackingUptimePct}%</span>
              </p>
            </div>
          </div>
        </ReportSection>

        <ReportSection
          icon={Paperclip}
          title="Attachment Upload Report"
          subtitle={`${analytics.attachmentTotal} files uploaded across ${analytics.visitsWithEvidence} visits`}
        >
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="rounded-xl bg-violet-50 border border-violet-100 p-3 text-center">
              <p className="text-xl font-bold text-violet-800 tabular-nums">{analytics.visitsWithEvidence}</p>
              <p className="text-[10px] text-violet-700 mt-1 font-medium">Visits With Files</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
              <p className="text-xl font-bold text-amber-800 tabular-nums">{analytics.attachmentTotal}</p>
              <p className="text-[10px] text-amber-700 mt-1 font-medium">Total Files Uploaded</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
              <p className="text-xl font-bold text-gray-800 tabular-nums">{analytics.evidenceRatePct}%</p>
              <p className="text-[10px] text-gray-600 mt-1 font-medium">Evidence Upload Rate</p>
            </div>
          </div>
        </ReportSection>
      </div>

      <ReportSection
        icon={Route}
        title="Route Analytics"
        subtitle="Today's tracked field travel based on employee GPS routes"
        action={
          <Link to="/tracking/routes" className="btn btn-secondary btn-sm">
            <Navigation className="w-3.5 h-3.5" /> Route History
          </Link>
        }
      >
        {routeDistances.length === 0 ? (
          <EmptyState
            icon={Route}
            title="No route distance data"
            subtitle="Distance travelled appears when employees share GPS during active workdays."
            action={
              <Link to="/tracking" className="btn btn-primary btn-sm">
                Open Live Tracking
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div
                className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-center"
                title={ANALYTICS_TOOLTIPS.routeDistance}
              >
                <p className="text-xl font-bold text-indigo-800 tabular-nums">
                  {formatDistanceKm(totalRouteKm)}
                </p>
                <p className="text-[10px] text-indigo-700 mt-1 font-medium">Distance Travelled</p>
                <p className="text-[10px] text-indigo-600 mt-0.5">Combined today</p>
              </div>
              <div
                className="rounded-xl bg-sky-50 border border-sky-100 p-3 text-center"
                title={ANALYTICS_TOOLTIPS.routeAverage}
              >
                <p className="text-xl font-bold text-sky-800 tabular-nums">
                  {formatDistanceKm(routeAnalytics.avgKm)}
                </p>
                <p className="text-[10px] text-sky-700 mt-1 font-medium">Average Distance</p>
                <p className="text-[10px] text-sky-600 mt-0.5">Per employee today</p>
              </div>
              <div
                className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center"
                title={ANALYTICS_TOOLTIPS.routeTotal}
              >
                <p className="text-xl font-bold text-emerald-800 tabular-nums">
                  {routeAnalytics.employeeCount}
                </p>
                <p className="text-[10px] text-emerald-700 mt-1 font-medium">Total Routes</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Employees tracked today</p>
              </div>
              <div className="rounded-xl bg-violet-50 border border-violet-100 p-3 text-center col-span-2 sm:col-span-1">
                <p className="text-sm font-bold text-violet-800 truncate">
                  {routeAnalytics.topDistance?.name || "\u2014"}
                </p>
                <p className="text-[10px] text-violet-700 mt-1 font-medium">Longest Route Today</p>
                <p className="text-[10px] text-violet-600 mt-0.5">
                  {routeAnalytics.topDistance
                    ? formatDistanceKm(routeAnalytics.topDistance.km)
                    : "No route data"}
                </p>
              </div>
            </div>
            <Suspense fallback={<RouteFallback label="Loading route chart\u2026" />}>
              <ReportsRouteChart data={routeChartData} />
            </Suspense>
            <div className="space-y-3 mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Distance by employee
              </p>
              {routeDistances
                .sort((a, b) => b.km - a.km)
                .slice(0, 8)
                .map((r) => (
                  <div key={r.name} className="flex items-center justify-between text-sm gap-3">
                    <span className="font-medium text-gray-700 truncate">{r.name}</span>
                    <span className="text-right flex-shrink-0">
                      <span className="font-semibold text-indigo-700 tabular-nums block">
                        {formatDistanceKm(r.km)}
                      </span>
                      <span className="text-[10px] text-gray-500">Distance Travelled</span>
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}
      </ReportSection>

      <div className="section-card">
        <div className="section-card-header">
          <div className="flex items-center gap-3">
            <div className="icon-box">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="section-title">Visit Records</h3>
              <p className="section-subtitle">{filtered.length} records</p>
            </div>
          </div>
          <div className="relative w-56">
            <input
              type="text"
              placeholder="Search records\u2026"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              style={{ paddingLeft: "2.25rem" }}
            />
            <svg
              className="search-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Farmer</th>
                <th>Crop</th>
                <th>Location</th>
                <th>Agent</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.slice(0, 50).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                        #{item.id}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <ProfileAvatar entity={item.farmer ?? item} name={item.farmer_name} size="xs" />
                        <span className="font-medium text-gray-900">{item.farmer_name || "\u2014"}</span>
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <Leaf className="w-3 h-3" />
                        {item.crop || "\u2014"}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <MapPin className="w-3 h-3 text-gray-300 flex-shrink-0" />
                        {item.location_name || "\u2014"}
                      </span>
                    </td>
                    <td className="text-gray-600">{item.employee || "\u2014"}</td>
                    <td>
                      <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <Calendar className="w-3 h-3 text-gray-300" />
                        {item.visit_date
                          ? new Date(item.visit_date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "\u2014"}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <EmptyState
                      icon={BarChart3}
                      title="No records found"
                      subtitle={search ? "Try a different search term or date range." : "Visit records will appear here once field agents submit visits."}
                      action={
                        search || dateFrom || dateTo ? (
                          <button type="button" onClick={() => { setSearch(""); load(); }} className="btn btn-secondary btn-md">
                            Reset filters
                          </button>
                        ) : (
                          <Link to="/visits" className="btn btn-primary btn-md">
                            View visits
                          </Link>
                        )
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 50 && (
          <div className="px-6 py-3 border-t border-gray-50 text-xs text-gray-400 text-center">
            Showing first 50 of {filtered.length} records
          </div>
        )}
      </div>
    </div>
  );
}
